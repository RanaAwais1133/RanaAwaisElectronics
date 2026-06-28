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

type ProductRepository struct {
	coll *mongo.Collection
}

func NewProductRepository() *ProductRepository {
	return &ProductRepository{coll: config.DB.Collection("products")}
}

func (r *ProductRepository) Create(ctx context.Context, p *domain.Product) error {
	p.ID = primitive.NewObjectID()
	p.CreatedAt = time.Now()
	p.UpdatedAt = time.Now()
	_, err := r.coll.InsertOne(ctx, p)
	return err
}

func (r *ProductRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*domain.Product, error) {
	var p domain.Product
	err := r.coll.FindOne(ctx, bson.M{"_id": id}).Decode(&p)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

func (r *ProductRepository) GetByIDWithStock(ctx context.Context, id primitive.ObjectID) (*domain.Product, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"_id": id}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "inventory",
			"localField":   "_id",
			"foreignField": "product_id",
			"as":           "inventory_items",
		}}},
		{{Key: "$addFields", Value: bson.M{
			"stock_count": bson.M{
				"$size": bson.M{
					"$filter": bson.M{
						"input": "$inventory_items",
						"cond":  bson.M{"$eq": bson.A{"$$this.status", "in_stock"}},
					},
				},
			},
		}}},
		{{Key: "$project", Value: bson.M{"inventory_items": 0}}},
	}
	cursor, err := r.coll.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var results []domain.Product
	if err = cursor.All(ctx, &results); err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return nil, nil
	}
	return &results[0], nil
}

func (r *ProductRepository) Update(ctx context.Context, id primitive.ObjectID, p *domain.Product) error {
	p.UpdatedAt = time.Now()
	_, err := r.coll.ReplaceOne(ctx, bson.M{"_id": id}, p)
	return err
}

func (r *ProductRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.coll.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *ProductRepository) List(ctx context.Context, skip, limit int64) ([]domain.Product, error) {
	opts := &options.FindOptions{}
	opts.SetSort(bson.M{"name": 1})
	opts.SetSkip(skip)
	opts.SetLimit(limit)

	cursor, err := r.coll.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var prods []domain.Product
	if err = cursor.All(ctx, &prods); err != nil {
		return nil, err
	}

	if len(prods) == 0 {
		return prods, nil
	}

	invColl := config.DB.Collection(config.ColInventory)
	productIDs := make([]primitive.ObjectID, len(prods))
	for i, p := range prods {
		productIDs[i] = p.ID
	}

	stockPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"product_id": bson.M{"$in": productIDs},
			"status":     "in_stock",
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$product_id",
			"count": bson.M{"$sum": 1},
		}}},
	}

	stockCursor, err := invColl.Aggregate(ctx, stockPipeline)
	if err != nil {
		return prods, nil
	}
	defer stockCursor.Close(ctx)

	var stockResults []struct {
		ID    primitive.ObjectID `bson:"_id"`
		Count int                `bson:"count"`
	}
	if err = stockCursor.All(ctx, &stockResults); err != nil {
		return prods, nil
	}

	stockMap := make(map[primitive.ObjectID]int)
	for _, sr := range stockResults {
		stockMap[sr.ID] = sr.Count
	}

	for i := range prods {
		prods[i].StockCount = stockMap[prods[i].ID]
		// Auto-update InStock based on StockCount
		prods[i].InStock = prods[i].StockCount > 0
	}

	return prods, nil
}

func (r *ProductRepository) Count(ctx context.Context) (int64, error) {
	return r.coll.CountDocuments(ctx, bson.M{})
}

func (r *ProductRepository) ListByCategory(ctx context.Context, category string) ([]domain.Product, error) {
	filter := bson.M{"category": category}
	cursor, err := r.coll.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var prods []domain.Product
	if err = cursor.All(ctx, &prods); err != nil {
		return nil, err
	}
	return prods, nil
}