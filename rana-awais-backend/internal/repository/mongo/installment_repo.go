package mongo

import (
	"context"
	"errors"
	"time"

	"github.com/your-org/rana-awais-backend/config"
	"github.com/your-org/rana-awais-backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type InstallmentRepository struct {
	coll *mongo.Collection
}

func NewInstallmentRepository() *InstallmentRepository {
	return &InstallmentRepository{
		coll: config.DB.Collection("installments"),
	}
}

func (r *InstallmentRepository) Create(ctx context.Context, plan *domain.InstallmentPlan) error {
	plan.ID = primitive.NewObjectID()
	plan.CreatedAt = time.Now()
	plan.UpdatedAt = time.Now()
	_, err := r.coll.InsertOne(ctx, plan)
	return err
}

func (r *InstallmentRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*domain.InstallmentPlan, error) {
	var plan domain.InstallmentPlan
	err := r.coll.FindOne(ctx, bson.M{"_id": id}).Decode(&plan)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &plan, nil
}

func (r *InstallmentRepository) Update(ctx context.Context, id primitive.ObjectID, plan *domain.InstallmentPlan) error {
	plan.UpdatedAt = time.Now()
	_, err := r.coll.ReplaceOne(ctx, bson.M{"_id": id}, plan)
	return err
}

func (r *InstallmentRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.coll.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *InstallmentRepository) ListByCustomer(ctx context.Context, customerID primitive.ObjectID) ([]domain.InstallmentPlan, error) {
	filter := bson.M{"customer_id": customerID}
	cursor, err := r.coll.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var plans []domain.InstallmentPlan
	if err = cursor.All(ctx, &plans); err != nil {
		return nil, err
	}
	return plans, nil
}

func (r *InstallmentRepository) GetActivePlans(ctx context.Context) ([]domain.InstallmentPlan, error) {
	filter := bson.M{"status": "active"}
	cursor, err := r.coll.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var plans []domain.InstallmentPlan
	if err = cursor.All(ctx, &plans); err != nil {
		return nil, err
	}
	return plans, nil
}

func (r *InstallmentRepository) GetPlansWithDueDate(ctx context.Context, dueDate time.Time) ([]domain.InstallmentPlan, error) {
	filter := bson.M{
		"installments": bson.M{
			"$elemMatch": bson.M{
				"due_date": bson.M{
					"$gte": time.Date(dueDate.Year(), dueDate.Month(), dueDate.Day(), 0, 0, 0, 0, dueDate.Location()),
					"$lt":  time.Date(dueDate.Year(), dueDate.Month(), dueDate.Day()+1, 0, 0, 0, 0, dueDate.Location()),
				},
				"paid": false,
			},
		},
	}
	cursor, err := r.coll.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var plans []domain.InstallmentPlan
	if err = cursor.All(ctx, &plans); err != nil {
		return nil, err
	}
	return plans, nil
}

func (r *InstallmentRepository) AddPaymentDetail(ctx context.Context, planID primitive.ObjectID, installmentNo int, payment domain.InstallmentDetail) error {
	filter := bson.M{"_id": planID, "installments.installment_no": installmentNo}
	update := bson.M{
		"$set": bson.M{
			"installments.$.paid":            payment.Paid,
			"installments.$.paid_date":       payment.PaidDate,
			"installments.$.fine":            payment.Fine,
			"installments.$.partial_paid":    payment.PartialPaid,
			"installments.$.remaining":       payment.Remaining,
			"installments.$.collected_by":    payment.CollectedBy,
			"installments.$.collected_by_id": payment.CollectedById,
			"installments.$.remarks":         payment.Remarks,
		},
	}
	_, err := r.coll.UpdateOne(ctx, filter, update)
	return err
}

func (r *InstallmentRepository) UpdateInstallmentStatus(ctx context.Context, planID primitive.ObjectID, installmentNo int, paid bool, paidDate *time.Time) error {
	filter := bson.M{"_id": planID, "installments.installment_no": installmentNo}
	update := bson.M{
		"$set": bson.M{
			"installments.$.paid":      paid,
			"installments.$.paid_date": paidDate,
		},
	}
	_, err := r.coll.UpdateOne(ctx, filter, update)
	return err
}

// ✅ NEW: Get plans with due date in range
func (r *InstallmentRepository) GetPlansWithDueDateRange(ctx context.Context, start, end time.Time) ([]domain.InstallmentPlan, error) {
	filter := bson.M{
		"installments": bson.M{
			"$elemMatch": bson.M{
				"due_date": bson.M{
					"$gte": start,
					"$lte": end,
				},
				"paid": false,
			},
		},
	}
	cursor, err := r.coll.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var plans []domain.InstallmentPlan
	if err = cursor.All(ctx, &plans); err != nil {
		return nil, err
	}
	return plans, nil
}

// ✅ NEW: Get installments by date range
func (r *InstallmentRepository) GetInstallmentsByDateRange(ctx context.Context, start, end time.Time) ([]domain.InstallmentDetail, error) {
	// This requires aggregation to unwind installments
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"status": "active"}}},
		{{Key: "$unwind", Value: "$installments"}},
		{{Key: "$match", Value: bson.M{
			"installments.due_date": bson.M{
				"$gte": start,
				"$lte": end,
			},
		}}},
		{{Key: "$project", Value: bson.M{
			"installment_no": "$installments.installment_no",
			"due_date":       "$installments.due_date",
			"amount":         "$installments.amount",
			"paid":           "$installments.paid",
			"paid_date":      "$installments.paid_date",
			"fine":           "$installments.fine",
			"partial_paid":   "$installments.partial_paid",
			"remaining":      "$installments.remaining",
			"collected_by":   "$installments.collected_by",
		}}},
	}
	cursor, err := r.coll.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var installments []domain.InstallmentDetail
	if err = cursor.All(ctx, &installments); err != nil {
		return nil, err
	}
	return installments, nil
}
