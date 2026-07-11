package mongodb

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// EnsureIndexes creates all required indexes for optimal query performance
func EnsureIndexes(db *mongo.Database) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	type indexDef struct {
		Collection string
		Indexes    []mongo.IndexModel
	}

	indexes := []indexDef{
		{
			Collection: "payments",
			Indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "transactiondate", Value: -1}}, Options: options.Index().SetBackground(true)},
				{Keys: bson.D{{Key: "installmentplanid", Value: 1}, {Key: "transactiondate", Value: -1}}, Options: options.Index().SetBackground(true)},
				{Keys: bson.D{{Key: "installmentplanid", Value: 1}, {Key: "installmentno", Value: 1}}, Options: options.Index().SetBackground(true)},
			},
		},
		{
			Collection: "installment_plans",
			Indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "status", Value: 1}}, Options: options.Index().SetBackground(true)},
				{Keys: bson.D{{Key: "customerid", Value: 1}}, Options: options.Index().SetBackground(true)},
				{Keys: bson.D{{Key: "status", Value: 1}, {Key: "customerid", Value: 1}}, Options: options.Index().SetBackground(true)},
				{Keys: bson.D{{Key: "productid", Value: 1}}, Options: options.Index().SetBackground(true)},
			},
		},
		{
			Collection: "customers",
			Indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "phone", Value: 1}}, Options: options.Index().SetBackground(true)},
				{Keys: bson.D{{Key: "name", Value: 1}}, Options: options.Index().SetBackground(true)},
				{Keys: bson.D{{Key: "createdat", Value: -1}}, Options: options.Index().SetBackground(true)},
			},
		},
		{
			Collection: "products",
			Indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "category", Value: 1}}, Options: options.Index().SetBackground(true)},
				{Keys: bson.D{{Key: "stockcount", Value: 1}}, Options: options.Index().SetBackground(true)},
			},
		},
		{
			Collection: "inventory_items",
			Indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "createdat", Value: -1}}, Options: options.Index().SetBackground(true)},
				{Keys: bson.D{{Key: "status", Value: 1}}, Options: options.Index().SetBackground(true)},
				{Keys: bson.D{{Key: "solddate", Value: -1}}, Options: options.Index().SetBackground(true)},
			},
		},
		{
			Collection: "audit_logs",
			Indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "timestamp", Value: -1}}, Options: options.Index().SetBackground(true)},
				{Keys: bson.D{{Key: "action", Value: 1}, {Key: "timestamp", Value: -1}}, Options: options.Index().SetBackground(true)},
			},
		},
		{
			Collection: "accounting_entries",
			Indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "date", Value: -1}, {Key: "basis", Value: 1}}, Options: options.Index().SetBackground(true)},
				{Keys: bson.D{{Key: "relatedplanid", Value: 1}}, Options: options.Index().SetBackground(true)},
			},
		},
	}

	for _, idx := range indexes {
		coll := db.Collection(idx.Collection)
		for i := range idx.Indexes {
			name := ""
			keys := idx.Indexes[i].Keys
			if d, ok := keys.(bson.D); ok {
				for _, elem := range d {
					if name != "" {
						name += "_"
					}
					name += elem.Key
				}
			}
			idx.Indexes[i].Options.SetName("idx_" + name)
		}

		created, err := coll.Indexes().CreateMany(ctx, idx.Indexes)
		if err != nil {
			log.Printf("[INDEXES] Warning creating indexes for %s: %v", idx.Collection, err)
			continue
		}
		log.Printf("[INDEXES] Created %d indexes for %s: %v", len(created), idx.Collection, created)
	}

	log.Println("[INDEXES] All MongoDB indexes ensured successfully")
	return nil
}
