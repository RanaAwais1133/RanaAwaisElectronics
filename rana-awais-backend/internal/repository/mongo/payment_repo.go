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
