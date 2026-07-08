package mongodb

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CollectionHelper provides common MongoDB operations
type CollectionHelper struct {
	Collection *mongo.Collection
}

// NewCollectionHelper creates a new helper for a collection
func NewCollectionHelper(coll *mongo.Collection) *CollectionHelper {
	return &CollectionHelper{Collection: coll}
}

// InsertOne inserts a document and returns the inserted ID
func (h *CollectionHelper) InsertOne(ctx context.Context, doc interface{}) (string, error) {
	result, err := h.Collection.InsertOne(ctx, doc)
	if err != nil {
		return "", err
	}
	return result.InsertedID.(primitive.ObjectID).Hex(), nil
}

// FindByID finds a document by its string ID (converts to ObjectID)
func (h *CollectionHelper) FindByID(ctx context.Context, id string, result interface{}) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	return h.Collection.FindOne(ctx, bson.M{"_id": objID}).Decode(result)
}

// FindOneByFilter finds a single document by filter
func (h *CollectionHelper) FindOneByFilter(ctx context.Context, filter bson.M, result interface{}) error {
	return h.Collection.FindOne(ctx, filter).Decode(result)
}

// FindByFilter finds documents by filter with pagination
func (h *CollectionHelper) FindByFilter(ctx context.Context, filter bson.M, results interface{}, opts ...*options.FindOptions) error {
	cursor, err := h.Collection.Find(ctx, filter, opts...)
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)
	return cursor.All(ctx, results)
}

// FindAll finds all documents with pagination
func (h *CollectionHelper) FindAll(ctx context.Context, results interface{}, skip, limit int64) error {
	opts := options.Find().
		SetSkip(skip).
		SetLimit(limit).
		SetSort(bson.D{{Key: "createdat", Value: -1}})
	cursor, err := h.Collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)
	return cursor.All(ctx, results)
}

// UpdateByID updates a document by its string ID
func (h *CollectionHelper) UpdateByID(ctx context.Context, id string, update bson.M) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = h.Collection.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": update})
	return err
}

// DeleteByID deletes a document by its string ID
func (h *CollectionHelper) DeleteByID(ctx context.Context, id string) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = h.Collection.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

// CountDocuments counts documents matching filter
func (h *CollectionHelper) CountDocuments(ctx context.Context, filter bson.M) (int64, error) {
	return h.Collection.CountDocuments(ctx, filter)
}

// CountAll counts all documents in the collection
func (h *CollectionHelper) CountAll(ctx context.Context) (int64, error) {
	return h.Collection.CountDocuments(ctx, bson.M{})
}

// Search performs text search across specified fields
func (h *CollectionHelper) Search(ctx context.Context, query string, fields []string, results interface{}, skip, limit int64) error {
	// Build an OR filter for each field using regex
	var conditions []bson.M
	for _, field := range fields {
		conditions = append(conditions, bson.M{
			field: bson.M{"$regex": primitive.Regex{Pattern: query, Options: "i"}},
		})
	}

	filter := bson.M{"$or": conditions}
	opts := options.Find().
		SetSkip(skip).
		SetLimit(limit).
		SetSort(bson.D{{Key: "createdat", Value: -1}})

	cursor, err := h.Collection.Find(ctx, filter, opts)
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)
	return cursor.All(ctx, results)
}

// EnsureIndex creates an index on a field
func (h *CollectionHelper) EnsureIndex(ctx context.Context, field string, unique bool) error {
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: field, Value: 1}},
		Options: options.Index().SetUnique(unique),
	}
	_, err := h.Collection.Indexes().CreateOne(ctx, indexModel)
	return err
}

// EnsureTextIndex creates a text index on multiple fields
func (h *CollectionHelper) EnsureTextIndex(ctx context.Context, fields ...string) error {
	keys := bson.D{}
	for _, field := range fields {
		keys = append(keys, bson.E{Key: field, Value: "text"})
	}
	indexModel := mongo.IndexModel{
		Keys: keys,
	}
	_, err := h.Collection.Indexes().CreateOne(ctx, indexModel)
	return err
}

// Now returns current time
func Now() time.Time {
	return time.Now()
}

// BoolToInt converts bool to int (for backward compatibility)
func BoolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
