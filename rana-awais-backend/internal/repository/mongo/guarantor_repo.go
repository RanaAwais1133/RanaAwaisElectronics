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
	"go.mongodb.org/mongo-driver/mongo/options"
)

type GuarantorRepository struct {
	coll *mongo.Collection
}

func NewGuarantorRepository() *GuarantorRepository {
	return &GuarantorRepository{
		coll: config.DB.Collection("guarantors"),
	}
}

func (r *GuarantorRepository) Create(ctx context.Context, g *domain.Guarantor) error {
	g.ID = primitive.NewObjectID()
	g.CreatedAt = time.Now()
	g.UpdatedAt = time.Now()
	_, err := r.coll.InsertOne(ctx, g)
	return err
}

func (r *GuarantorRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*domain.Guarantor, error) {
	var g domain.Guarantor
	err := r.coll.FindOne(ctx, bson.M{"_id": id}).Decode(&g)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &g, nil
}

func (r *GuarantorRepository) Update(ctx context.Context, id primitive.ObjectID, g *domain.Guarantor) error {
	g.UpdatedAt = time.Now()
	_, err := r.coll.ReplaceOne(ctx, bson.M{"_id": id}, g)
	return err
}

func (r *GuarantorRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.coll.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *GuarantorRepository) List(ctx context.Context, skip, limit int64) ([]domain.Guarantor, error) {
	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.M{"created_at": -1})
	cursor, err := r.coll.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var guarantors []domain.Guarantor
	if err = cursor.All(ctx, &guarantors); err != nil {
		return nil, err
	}
	return guarantors, nil
}

func (r *GuarantorRepository) Count(ctx context.Context) (int64, error) {
	return r.coll.CountDocuments(ctx, bson.M{})
}

func (r *GuarantorRepository) ListByCustomer(ctx context.Context, customerID primitive.ObjectID) ([]domain.Guarantor, error) {
	filter := bson.M{"customer_id": customerID}
	cursor, err := r.coll.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var guarantors []domain.Guarantor
	if err = cursor.All(ctx, &guarantors); err != nil {
		return nil, err
	}
	return guarantors, nil
}