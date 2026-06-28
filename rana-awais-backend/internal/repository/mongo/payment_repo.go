package mongo

import (
	"context"
	"errors"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type PaymentRepository struct {
	coll *mongo.Collection
}

func NewPaymentRepository() *PaymentRepository {
	return &PaymentRepository{
		coll: config.DB.Collection("payments"),
	}
}

func (r *PaymentRepository) Create(ctx context.Context, p *domain.Payment) error {
	p.ID = primitive.NewObjectID()
	p.CreatedAt = time.Now()
	_, err := r.coll.InsertOne(ctx, p)
	return err
}

func (r *PaymentRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*domain.Payment, error) {
	var p domain.Payment
	err := r.coll.FindOne(ctx, bson.M{"_id": id}).Decode(&p)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

func (r *PaymentRepository) ListByPlan(ctx context.Context, planID primitive.ObjectID) ([]domain.Payment, error) {
	filter := bson.M{"installment_plan_id": planID}
	cursor, err := r.coll.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var payments []domain.Payment
	if err = cursor.All(ctx, &payments); err != nil {
		return nil, err
	}
	return payments, nil
}

// ✅ NEW: Get payments by date range
func (r *PaymentRepository) GetPaymentsByDateRange(ctx context.Context, start, end time.Time) ([]domain.Payment, error) {
	filter := bson.M{
		"transaction_date": bson.M{
			"$gte": start,
			"$lte": end,
		},
	}
	cursor, err := r.coll.Find(ctx, filter, options.Find().SetSort(bson.M{"transaction_date": -1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var payments []domain.Payment
	if err = cursor.All(ctx, &payments); err != nil {
		return nil, err
	}
	return payments, nil
}

// ✅ NEW: Get today's payments
func (r *PaymentRepository) GetTodayPayments(ctx context.Context) ([]domain.Payment, error) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	end := start.Add(24 * time.Hour)
	return r.GetPaymentsByDateRange(ctx, start, end)
}

// ✅ NEW: Get monthly payments
func (r *PaymentRepository) GetMonthlyPayments(ctx context.Context, year int, month time.Month) ([]domain.Payment, error) {
	start := time.Date(year, month, 1, 0, 0, 0, 0, time.Local)
	end := start.AddDate(0, 1, 0)
	return r.GetPaymentsByDateRange(ctx, start, end)
}
