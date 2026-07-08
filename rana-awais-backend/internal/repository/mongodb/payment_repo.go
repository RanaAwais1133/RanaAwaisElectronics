package mongodb

import (
	"context"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type PaymentRepository struct {
	coll *mongo.Collection
}

func NewPaymentRepository(db *mongo.Database) *PaymentRepository {
	return &PaymentRepository{
		coll: db.Collection("payments"),
	}
}

func (r *PaymentRepository) Create(ctx context.Context, p *domain.Payment) error {
	if p.ID == "" {
		p.ID = primitive.NewObjectID().Hex()
	}
	p.CreatedAt = time.Now()

	_, err := r.coll.InsertOne(ctx, p)
	return err
}

func (r *PaymentRepository) GetByID(ctx context.Context, id string) (*domain.Payment, error) {
	var p domain.Payment
	err := r.coll.FindOne(ctx, getFilterByID(id)).Decode(&p)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}


func (r *PaymentRepository) ListByPlan(ctx context.Context, planID string) ([]domain.Payment, error) {
	cursor, err := r.coll.Find(ctx, bson.M{"installmentplanid": planID}, options.Find().SetSort(bson.D{{Key: "transactiondate", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var payments []domain.Payment
	err = cursor.All(ctx, &payments)
	if err != nil {
		return nil, err
	}
	if payments == nil {
		payments = []domain.Payment{}
	}
	return payments, nil
}

func (r *PaymentRepository) ListAll(ctx context.Context, skip, limit int64) ([]domain.Payment, error) {
	opts := options.Find().
		SetSkip(skip).
		SetLimit(limit).
		SetSort(bson.D{{Key: "transactiondate", Value: -1}})
	cursor, err := r.coll.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var payments []domain.Payment
	err = cursor.All(ctx, &payments)
	if err != nil {
		return nil, err
	}
	if payments == nil {
		payments = []domain.Payment{}
	}
	return payments, nil
}

func (r *PaymentRepository) GetPaymentsByDateRange(ctx context.Context, start, end time.Time) ([]domain.Payment, error) {
	cursor, err := r.coll.Find(ctx, bson.M{
		"transactiondate": bson.M{"$gte": start, "$lt": end},
	}, options.Find().SetSort(bson.D{{Key: "transactiondate", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var payments []domain.Payment
	err = cursor.All(ctx, &payments)
	if err != nil {
		return nil, err
	}
	if payments == nil {
		payments = []domain.Payment{}
	}
	return payments, nil
}

func (r *PaymentRepository) GetTodayPayments(ctx context.Context) ([]domain.Payment, error) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	end := start.Add(24 * time.Hour)
	return r.GetPaymentsByDateRange(ctx, start, end)
}

func (r *PaymentRepository) GetMonthlyPayments(ctx context.Context, year int, month time.Month) ([]domain.Payment, error) {
	start := time.Date(year, month, 1, 0, 0, 0, 0, time.Local)
	end := start.AddDate(0, 1, 0)
	return r.GetPaymentsByDateRange(ctx, start, end)
}

func (r *PaymentRepository) Delete(ctx context.Context, id string) error {
	_, err := r.coll.DeleteOne(ctx, getFilterByID(id))
	return err
}


