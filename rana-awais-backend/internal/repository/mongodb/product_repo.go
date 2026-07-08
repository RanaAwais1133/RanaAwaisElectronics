package mongodb

import (
	"context"
	"fmt"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ProductRepository struct {
	coll *mongo.Collection
}

func NewProductRepository(db *mongo.Database) *ProductRepository {
	return &ProductRepository{
		coll: db.Collection("products"),
	}
}

// getFilterByID creates a filter that matches both ObjectID and string _id fields
// This handles the case where MongoDB stores _id as a string (via bson:"_id" tag on a string field)
func getFilterByID(id string) bson.M {
	// Always try string match first since our domain models use string IDs
	// Also try ObjectID match for legacy data that might be stored as ObjectID
	orConditions := []bson.M{
		{"_id": id},
	}
	if objID, err := primitive.ObjectIDFromHex(id); err == nil {
		orConditions = append(orConditions, bson.M{"_id": objID})
	}
	if len(orConditions) == 1 {
		return orConditions[0]
	}
	return bson.M{"$or": orConditions}
}

func (r *ProductRepository) Create(ctx context.Context, p *domain.Product) error {
	if p.ID == "" {
		p.ID = primitive.NewObjectID().Hex()
	}
	p.CreatedAt = time.Now()
	p.UpdatedAt = time.Now()

	if p.StockCount > 0 {
		p.InStock = true
	} else {
		p.InStock = false
	}

	_, err := r.coll.InsertOne(ctx, p)
	return err
}

func (r *ProductRepository) GetByID(ctx context.Context, id string) (*domain.Product, error) {
	var p domain.Product
	err := r.coll.FindOne(ctx, getFilterByID(id)).Decode(&p)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

func (r *ProductRepository) GetByIDWithStock(ctx context.Context, id string) (*domain.Product, error) {
	return r.GetByID(ctx, id)
}

func (r *ProductRepository) Update(ctx context.Context, id string, p *domain.Product) error {
	p.UpdatedAt = time.Now()

	// Build update with lowercase JSON field names to match MongoDB stored format
	updateFields := bson.M{
		"name":          p.Name,
		"nameUrdu":      p.NameUrdu,
		"company":       p.Company,
		"companyUrdu":   p.CompanyUrdu,
		"category":      p.Category,
		"price":         p.Price,
		"purchasePrice": p.PurchasePrice,
		"description":   p.Description,
		"sku":           p.SKU,
		"stockCount":    p.StockCount,
		"in_stock":      p.InStock,
		"created_by":    p.CreatedBy,
		"updatedAt":     p.UpdatedAt,
	}

	// Only include non-zero fields to allow partial updates
	update := bson.M{"$set": updateFields}

	_, err := r.coll.UpdateOne(ctx, getFilterByID(id), update)
	return err
}

func (r *ProductRepository) Delete(ctx context.Context, id string) error {
	result, err := r.coll.DeleteOne(ctx, getFilterByID(id))
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("product not found with id: %s", id)
	}
	return nil
}

func (r *ProductRepository) List(ctx context.Context, skip, limit int64) ([]domain.Product, error) {
	opts := options.Find().
		SetSkip(skip).
		SetLimit(limit).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := r.coll.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var products []domain.Product
	err = cursor.All(ctx, &products)
	if err != nil {
		return nil, err
	}
	if products == nil {
		products = []domain.Product{}
	}
	return products, nil
}

func (r *ProductRepository) ListByCategory(ctx context.Context, category string) ([]domain.Product, error) {
	cursor, err := r.coll.Find(ctx, bson.M{"category": category}, options.Find().SetSort(bson.D{{Key: "name", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var products []domain.Product
	err = cursor.All(ctx, &products)
	if err != nil {
		return nil, err
	}
	if products == nil {
		products = []domain.Product{}
	}
	return products, nil
}

func (r *ProductRepository) Count(ctx context.Context) (int64, error) {
	return r.coll.CountDocuments(ctx, bson.M{})
}

// Search performs text search on products
func (r *ProductRepository) Search(ctx context.Context, query string, skip, limit int64) ([]domain.Product, error) {
	filter := bson.M{
		"$or": []bson.M{
			{"name": bson.M{"$regex": query, "$options": "i"}},
			{"nameUrdu": bson.M{"$regex": query, "$options": "i"}},
			{"category": bson.M{"$regex": query, "$options": "i"}},
			{"company": bson.M{"$regex": query, "$options": "i"}},
			{"companyUrdu": bson.M{"$regex": query, "$options": "i"}},
			{"sku": bson.M{"$regex": query, "$options": "i"}},
			{"description": bson.M{"$regex": query, "$options": "i"}},
		},
	}

	opts := options.Find().
		SetSkip(skip).
		SetLimit(limit).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := r.coll.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var products []domain.Product
	err = cursor.All(ctx, &products)
	if err != nil {
		return nil, err
	}
	if products == nil {
		products = []domain.Product{}
	}
	return products, nil
}

// BulkDelete deletes multiple products by IDs
func (r *ProductRepository) BulkDelete(ctx context.Context, ids []string) error {
	// Build filter that matches both string and ObjectID _id fields
	orConditions := []bson.M{
		{"_id": bson.M{"$in": ids}},
	}

	var objIDs []primitive.ObjectID
	for _, id := range ids {
		if objID, err := primitive.ObjectIDFromHex(id); err == nil {
			objIDs = append(objIDs, objID)
		}
	}
	if len(objIDs) > 0 {
		orConditions = append(orConditions, bson.M{"_id": bson.M{"$in": objIDs}})
	}

	filter := bson.M{"$or": orConditions}
	_, err := r.coll.DeleteMany(ctx, filter)
	return err
}

// GetLowStock returns products with stock below threshold
func (r *ProductRepository) GetLowStock(ctx context.Context, threshold int) ([]domain.Product, error) {
	filter := bson.M{"stockCount": bson.M{"$lte": threshold, "$gte": 0}}
	cursor, err := r.coll.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "stockCount", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var products []domain.Product
	err = cursor.All(ctx, &products)
	if err != nil {
		return nil, err
	}
	if products == nil {
		products = []domain.Product{}
	}
	return products, nil
}


