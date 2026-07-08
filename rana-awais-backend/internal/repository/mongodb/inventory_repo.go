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

type InventoryRepository struct {
	coll *mongo.Collection
}

func NewInventoryRepository(db *mongo.Database) *InventoryRepository {
	return &InventoryRepository{
		coll: db.Collection("inventory_items"),
	}
}

func (r *InventoryRepository) Create(ctx context.Context, item *domain.InventoryItem) error {
	if item.ID == "" {
		item.ID = primitive.NewObjectID().Hex()
	}
	item.CreatedAt = time.Now()
	item.UpdatedAt = time.Now()

	_, err := r.coll.InsertOne(ctx, item)
	return err
}

func (r *InventoryRepository) GetByID(ctx context.Context, id string) (*domain.InventoryItem, error) {
	var item domain.InventoryItem
	err := r.coll.FindOne(ctx, getFilterByID(id)).Decode(&item)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *InventoryRepository) Update(ctx context.Context, id string, item *domain.InventoryItem) error {
	item.UpdatedAt = time.Now()
	_, err := r.coll.ReplaceOne(ctx, getFilterByID(id), item)
	return err
}

func (r *InventoryRepository) Delete(ctx context.Context, id string) error {
	_, err := r.coll.DeleteOne(ctx, getFilterByID(id))
	return err
}

func (r *InventoryRepository) List(ctx context.Context, skip, limit int64) ([]domain.InventoryItem, error) {
	opts := options.Find().
		SetSkip(skip).
		SetLimit(limit).
		SetSort(bson.D{{Key: "createdat", Value: -1}})
	cursor, err := r.coll.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var items []domain.InventoryItem
	err = cursor.All(ctx, &items)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []domain.InventoryItem{}
	}
	return items, nil
}

func (r *InventoryRepository) GetBySerial(ctx context.Context, serial string) (*domain.InventoryItem, error) {
	var item domain.InventoryItem
	err := r.coll.FindOne(ctx, bson.M{"serialnumber": serial}).Decode(&item)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *InventoryRepository) GetAgeingReport(ctx context.Context, olderThanDays int) ([]domain.InventoryItem, error) {
	cutoff := time.Now().AddDate(0, 0, -olderThanDays)
	filter := bson.M{
		"createdat": bson.M{"$lte": cutoff},
		"status":    "in_stock",
	}
	cursor, err := r.coll.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var items []domain.InventoryItem
	err = cursor.All(ctx, &items)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []domain.InventoryItem{}
	}
	return items, nil
}

func (r *InventoryRepository) ListByProduct(ctx context.Context, productID string) ([]domain.InventoryItem, error) {
	cursor, err := r.coll.Find(ctx, bson.M{"productid": productID}, options.Find().SetSort(bson.D{{Key: "createdat", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var items []domain.InventoryItem
	err = cursor.All(ctx, &items)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []domain.InventoryItem{}
	}
	return items, nil
}

func (r *InventoryRepository) Count(ctx context.Context) (int64, error) {
	return r.coll.CountDocuments(ctx, bson.M{})
}
