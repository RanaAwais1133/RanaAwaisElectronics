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

type CustomerRepository struct {
	coll *mongo.Collection
	helper *CollectionHelper
}

func NewCustomerRepository(db *mongo.Database) *CustomerRepository {
	coll := db.Collection("customers")
	return &CustomerRepository{
		coll:   coll,
		helper: NewCollectionHelper(coll),
	}
}

func (r *CustomerRepository) Create(ctx context.Context, c *domain.Customer) error {
	if c.ID == "" {
		c.ID = primitive.NewObjectID().Hex()
	}
	c.CreatedAt = time.Now()
	c.UpdatedAt = time.Now()

	_, err := r.coll.InsertOne(ctx, c)
	return err
}

func (r *CustomerRepository) GetByID(ctx context.Context, id string) (*domain.Customer, error) {
	var c domain.Customer
	err := r.coll.FindOne(ctx, bson.M{"_id": id}).Decode(&c)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *CustomerRepository) GetByPhone(ctx context.Context, phone string) (*domain.Customer, error) {
	var c domain.Customer
	err := r.coll.FindOne(ctx, bson.M{"phone": phone}).Decode(&c)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *CustomerRepository) Update(ctx context.Context, id string, c *domain.Customer) error {
	c.UpdatedAt = time.Now()
	// ✅ Use UpdateOne instead of ReplaceOne for better performance
	update := bson.M{"$set": c}
	_, err := r.coll.UpdateOne(ctx, bson.M{"_id": id}, update)
	return err
}

func (r *CustomerRepository) Delete(ctx context.Context, id string) error {
	_, err := r.coll.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *CustomerRepository) List(ctx context.Context, skip, limit int64) ([]domain.Customer, error) {
	opts := options.Find().
		SetSkip(skip).
		SetLimit(limit).
		SetSort(bson.D{{Key: "createdat", Value: -1}})
	cursor, err := r.coll.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var customers []domain.Customer
	err = cursor.All(ctx, &customers)
	if err != nil {
		return nil, err
	}
	if customers == nil {
		customers = []domain.Customer{}
	}
	return customers, nil
}

func (r *CustomerRepository) Search(ctx context.Context, query string, skip, limit int64) ([]domain.Customer, error) {
	searchPattern := primitive.Regex{Pattern: query, Options: "i"}
	filter := bson.M{
		"$or": []bson.M{
			{"name": bson.M{"$regex": searchPattern}},
			{"nameurdu": bson.M{"$regex": searchPattern}},
			{"fathername": bson.M{"$regex": searchPattern}},
			{"fathernameurdu": bson.M{"$regex": searchPattern}},
			{"phone": bson.M{"$regex": searchPattern}},
			{"cnic": bson.M{"$regex": searchPattern}},
			{"accountno": bson.M{"$regex": searchPattern}},
			{"costno": bson.M{"$regex": searchPattern}},
			{"processno": bson.M{"$regex": searchPattern}},
		},
	}
	opts := options.Find().
		SetSkip(skip).
		SetLimit(limit).
		SetSort(bson.D{{Key: "createdat", Value: -1}})
	cursor, err := r.coll.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var customers []domain.Customer
	err = cursor.All(ctx, &customers)
	if err != nil {
		return nil, err
	}
	if customers == nil {
		customers = []domain.Customer{}
	}
	return customers, nil
}

func (r *CustomerRepository) Count(ctx context.Context) (int64, error) {
	return r.coll.CountDocuments(ctx, bson.M{})
}
