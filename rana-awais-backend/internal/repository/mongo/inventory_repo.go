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

type InventoryRepository struct {
	coll *mongo.Collection
}

func NewInventoryRepository() *InventoryRepository {
	return &InventoryRepository{
		coll: config.DB.Collection("inventory"),
	}
}

func (r *InventoryRepository) Create(ctx context.Context, item *domain.InventoryItem) error {
	item.ID = primitive.NewObjectID()
	item.CreatedAt = time.Now()
	item.UpdatedAt = time.Now()
	_, err := r.coll.InsertOne(ctx, item)
	return err
}

func (r *InventoryRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*domain.InventoryItem, error) {
	var item domain.InventoryItem
	err := r.coll.FindOne(ctx, bson.M{"_id": id}).Decode(&item)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *InventoryRepository) Update(ctx context.Context, id primitive.ObjectID, item *domain.InventoryItem) error {
	item.UpdatedAt = time.Now()
	_, err := r.coll.ReplaceOne(ctx, bson.M{"_id": id}, item)
	return err
}

func (r *InventoryRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.coll.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *InventoryRepository) List(ctx context.Context, skip, limit int64) ([]domain.InventoryItem, error) {
	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.M{"purchase_date": -1})
	cursor, err := r.coll.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var items []domain.InventoryItem
	if err = cursor.All(ctx, &items); err != nil {
		return nil, err
	}
	return items, nil
}

func (r *InventoryRepository) GetBySerial(ctx context.Context, serial string) (*domain.InventoryItem, error) {
	var item domain.InventoryItem
	err := r.coll.FindOne(ctx, bson.M{"serial_number": serial}).Decode(&item)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *InventoryRepository) GetAgeingReport(ctx context.Context, olderThanDays int) ([]domain.InventoryItem, error) {
	cutoff := time.Now().AddDate(0, 0, -olderThanDays)
	filter := bson.M{
		"status": "in_stock",
		"purchase_date": bson.M{"$lt": cutoff},
	}
	cursor, err := r.coll.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var items []domain.InventoryItem
	if err = cursor.All(ctx, &items); err != nil {
		return nil, err
	}
	return items, nil
}

func (r *InventoryRepository) Count(ctx context.Context) (int64, error) {
	return r.coll.CountDocuments(ctx, bson.M{})
}

func (r *InventoryRepository) ListByProduct(ctx context.Context, productID primitive.ObjectID) ([]domain.InventoryItem, error) {
	filter := bson.M{"product_id": productID}
	cursor, err := r.coll.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var items []domain.InventoryItem
	if err = cursor.All(ctx, &items); err != nil {
		return nil, err
	}
	return items, nil
}