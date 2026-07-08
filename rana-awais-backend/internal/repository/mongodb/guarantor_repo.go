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
	var g domain.Guarantor
	err := r.coll.FindOne(ctx, getFilterByID(id)).Decode(&g)
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
	_, err := r.coll.ReplaceOne(ctx, getFilterByID(id), g)
	return err
}

func (r *GuarantorRepository) Delete(ctx context.Context, id string) error {
	_, err := r.coll.DeleteOne(ctx, getFilterByID(id))
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

// ✅ NEW: ListByCustomerIDs - Fetch guarantors for multiple customers at once (optimized N+1 fix)
func (r *GuarantorRepository) ListByCustomerIDs(ctx context.Context, customerIDs []string) ([]domain.Guarantor, error) {
	if len(customerIDs) == 0 {
		return []domain.Guarantor{}, nil
	}
	cursor, err := r.coll.Find(ctx, bson.M{"customerid": bson.M{"$in": customerIDs}}, options.Find().SetSort(bson.D{{Key: "createdat", Value: 1}}))
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
