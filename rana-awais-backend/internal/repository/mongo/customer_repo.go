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

type CustomerRepository struct {
	coll *mongo.Collection
}

func NewCustomerRepository() *CustomerRepository {
	return &CustomerRepository{coll: config.DB.Collection("customers")}
}

func (r *CustomerRepository) Create(ctx context.Context, c *domain.Customer) error {
	c.ID = primitive.NewObjectID()
	c.CreatedAt = time.Now()
	c.UpdatedAt = time.Now()
	_, err := r.coll.InsertOne(ctx, c)
	return err
}

func (r *CustomerRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*domain.Customer, error) {
	var cust domain.Customer
	err := r.coll.FindOne(ctx, bson.M{"_id": id}).Decode(&cust)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &cust, nil
}

func (r *CustomerRepository) GetByPhone(ctx context.Context, phone string) (*domain.Customer, error) {
	var cust domain.Customer
	err := r.coll.FindOne(ctx, bson.M{"phone": phone}).Decode(&cust)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &cust, nil
}

func (r *CustomerRepository) Update(ctx context.Context, id primitive.ObjectID, c *domain.Customer) error {
	c.UpdatedAt = time.Now()
	_, err := r.coll.ReplaceOne(ctx, bson.M{"_id": id}, c)
	return err
}

func (r *CustomerRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.coll.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *CustomerRepository) List(ctx context.Context, skip, limit int64) ([]domain.Customer, error) {
	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.M{"created_at": -1})
	cursor, err := r.coll.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var custs []domain.Customer
	if err = cursor.All(ctx, &custs); err != nil {
		return nil, err
	}
	return custs, nil
}

func (r *CustomerRepository) Count(ctx context.Context) (int64, error) {
	return r.coll.CountDocuments(ctx, bson.M{})
}

func (r *CustomerRepository) Search(ctx context.Context, query string, skip, limit int64) ([]domain.Customer, error) {
	filter := bson.M{
		"$or": []bson.M{
			{"name":             bson.M{"$regex": query, "$options": "i"}},
			{"name_urdu":        bson.M{"$regex": query, "$options": "i"}},
			{"father_name":      bson.M{"$regex": query, "$options": "i"}},
			{"father_name_urdu": bson.M{"$regex": query, "$options": "i"}},
			{"phone":            bson.M{"$regex": query}},
			{"cnic":             bson.M{"$regex": query}},
			{"account_no":       bson.M{"$regex": query, "$options": "i"}},
			{"cost_no":          bson.M{"$regex": query, "$options": "i"}},
			{"process_no":       bson.M{"$regex": query, "$options": "i"}},
		},
	}
	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.M{"created_at": -1})
	cursor, err := r.coll.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var custs []domain.Customer
	if err = cursor.All(ctx, &custs); err != nil {
		return nil, err
	}
	return custs, nil
}
