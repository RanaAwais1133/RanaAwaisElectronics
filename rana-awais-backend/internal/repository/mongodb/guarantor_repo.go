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

type GuarantorRepository struct {
	coll *mongo.Collection
}

func NewGuarantorRepository(db *mongo.Database) *GuarantorRepository {
	return &GuarantorRepository{
		coll: db.Collection("guarantors"),
	}
}

func (r *GuarantorRepository) Create(ctx context.Context, g *domain.Guarantor) error {
	if g.ID == "" {
		g.ID = primitive.NewObjectID().Hex()
	}
	g.CreatedAt = time.Now()
	g.UpdatedAt = time.Now()

	_, err := r.coll.InsertOne(ctx, g)
	return err
}

func (r *GuarantorRepository) GetByID(ctx context.Context, id string) (*domain.Guarantor, error) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var g domain.Guarantor
	err = r.coll.FindOne(ctx, bson.M{"_id": objID}).Decode(&g)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &g, nil
}

func (r *GuarantorRepository) Update(ctx context.Context, id string, g *domain.Guarantor) error {
	g.UpdatedAt = time.Now()
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.coll.ReplaceOne(ctx, bson.M{"_id": objID}, g)
	return err
}

func (r *GuarantorRepository) Delete(ctx context.Context, id string) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.coll.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

func (r *GuarantorRepository) List(ctx context.Context, skip, limit int64) ([]domain.Guarantor, error) {
	opts := options.Find().
		SetSkip(skip).
		SetLimit(limit).
		SetSort(bson.D{{Key: "createdat", Value: -1}})
	cursor, err := r.coll.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var guarantors []domain.Guarantor
	err = cursor.All(ctx, &guarantors)
	if err != nil {
		return nil, err
	}
	if guarantors == nil {
		guarantors = []domain.Guarantor{}
	}
	return guarantors, nil
}

func (r *GuarantorRepository) ListByCustomer(ctx context.Context, customerID string) ([]domain.Guarantor, error) {
	cursor, err := r.coll.Find(ctx, bson.M{"customerid": customerID}, options.Find().SetSort(bson.D{{Key: "createdat", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var guarantors []domain.Guarantor
	err = cursor.All(ctx, &guarantors)
	if err != nil {
		return nil, err
	}
	if guarantors == nil {
		guarantors = []domain.Guarantor{}
	}
	return guarantors, nil
}

func (r *GuarantorRepository) Count(ctx context.Context) (int64, error) {
	return r.coll.CountDocuments(ctx, bson.M{})
}
