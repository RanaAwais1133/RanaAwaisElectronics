package config

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

// DB holds the active database connection.
var DB *mongo.Database

// Client holds the MongoDB client (useful for transactions or advanced operations).
var Client *mongo.Client

// ConnectDB establishes a connection to MongoDB using the provided configuration.
// It exits the application if the connection fails.
func ConnectDB(cfg *Config) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOpts := options.Client().
		ApplyURI(cfg.MongoURI).
		SetMaxPoolSize(50).
		SetMinPoolSize(10).
		SetMaxConnIdleTime(5 * time.Minute)

	// Log the MongoDB URI (with masked password) for debugging
	log.Printf("🔌 Connecting to MongoDB: %s", cfg.GetMongoURI())

	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		log.Fatalf("❌ MongoDB connection failed: %v\n🔧 TROUBLESHOOT: Check your MONGO_URI in .env file or Render Dashboard environment variables", err)
	}

	// Ping the primary to verify the connection is alive.
	if err = client.Ping(ctx, readpref.Primary()); err != nil {
		log.Fatalf("❌ MongoDB ping failed: %v\n🔧 TROUBLESHOOT:\n  1. Check if MONGO_URI is correct in .env or Render Dashboard\n  2. Whitelist IP 0.0.0.0/0 in MongoDB Atlas Network Access\n  3. Verify database user credentials (username/password)\n  4. Make sure the database user has read/write permissions\n  5. Add &authMechanism=SCRAM-SHA-256 to MONGO_URI (Atlas deprecated SCRAM-SHA-1)", err)
	}

	Client = client
	DB = client.Database(cfg.DBName)
	log.Println("✅ MongoDB connected successfully")

	// Create indexes for performance
	go createIndexes()
}

func createIndexes() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Installments collection indexes
	installmentsColl := DB.Collection("installments")
	installmentIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "customer_id", Value: 1}},
			Options: options.Index().SetBackground(true),
		},
		{
			Keys:    bson.D{{Key: "status", Value: 1}},
			Options: options.Index().SetBackground(true),
		},
		{
			Keys:    bson.D{{Key: "product_id", Value: 1}},
			Options: options.Index().SetBackground(true),
		},
		{
			Keys:    bson.D{{Key: "installments.due_date", Value: 1}},
			Options: options.Index().SetBackground(true),
		},
	}
	if _, err := installmentsColl.Indexes().CreateMany(ctx, installmentIndexes); err != nil {
		log.Printf("Warning: Failed to create installment indexes: %v", err)
	} else {
		log.Println("Installment indexes created successfully")
	}

	// Customers collection indexes
	customersColl := DB.Collection("customers")
	customerIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "phone", Value: 1}},
			Options: options.Index().SetUnique(true).SetBackground(true),
		},
		{
			Keys:    bson.D{{Key: "name", Value: 1}},
			Options: options.Index().SetBackground(true),
		},
	}
	if _, err := customersColl.Indexes().CreateMany(ctx, customerIndexes); err != nil {
		log.Printf("Warning: Failed to create customer indexes: %v", err)
	} else {
		log.Println("Customer indexes created successfully")
	}

	// Products collection indexes
	productsColl := DB.Collection("products")
	productIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "name", Value: 1}},
			Options: options.Index().SetBackground(true),
		},
		{
			Keys:    bson.D{{Key: "category", Value: 1}},
			Options: options.Index().SetBackground(true),
		},
	}
	if _, err := productsColl.Indexes().CreateMany(ctx, productIndexes); err != nil {
		log.Printf("Warning: Failed to create product indexes: %v", err)
	} else {
		log.Println("Product indexes created successfully")
	}

	// Inventory collection indexes
	inventoryColl := DB.Collection("inventory")
	inventoryIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "product_id", Value: 1}},
			Options: options.Index().SetBackground(true),
		},
		{
			Keys:    bson.D{{Key: "status", Value: 1}},
			Options: options.Index().SetBackground(true),
		},
		{
			Keys:    bson.D{{Key: "product_id", Value: 1}, {Key: "status", Value: 1}},
			Options: options.Index().SetBackground(true),
		},
	}
	if _, err := inventoryColl.Indexes().CreateMany(ctx, inventoryIndexes); err != nil {
		log.Printf("Warning: Failed to create inventory indexes: %v", err)
	} else {
		log.Println("Inventory indexes created successfully")
	}

	// Audit logs collection indexes
	auditColl := DB.Collection("audit_logs")
	auditIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "timestamp", Value: -1}},
			Options: options.Index().SetBackground(true),
		},
	}
	if _, err := auditColl.Indexes().CreateMany(ctx, auditIndexes); err != nil {
		log.Printf("Warning: Failed to create audit log indexes: %v", err)
	} else {
		log.Println("Audit log indexes created successfully")
	}

	log.Println("All MongoDB indexes created/verified")
}
