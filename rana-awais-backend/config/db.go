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

// ═══════════════════════════════════════
// 📦 GLOBAL VARIABLES
// ═══════════════════════════════════════

// DB holds the active database connection.
var DB *mongo.Database

// Client holds the MongoDB client (useful for transactions or advanced operations).
var Client *mongo.Client

// ═══════════════════════════════════════
// 🔌 COLLECTION NAMES (DRY)
// ═══════════════════════════════════════

const (
	ColCustomers    = "customers"
	ColGuarantors   = "guarantors"
	ColProducts     = "products"
	ColInventory    = "inventory"
	ColInstallments = "installments"
	ColPayments     = "payments"
	ColAuditLogs    = "audit_logs"
	ColNotifications = "notifications"
	ColAccounting   = "accounting"
	ColUsers        = "users"
)

// ═══════════════════════════════════════
// 🔌 CONNECT TO DATABASE
// ═══════════════════════════════════════

// ConnectDB establishes a connection to MongoDB using the provided configuration.
// It will retry up to 3 times before failing.
func ConnectDB(cfg *Config) {
	var client *mongo.Client
	var err error

	maxRetries := 3
	retryDelay := 2 * time.Second

	for attempt := 1; attempt <= maxRetries; attempt++ {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)

		clientOpts := options.Client().
			ApplyURI(cfg.MongoURI).
			SetMaxPoolSize(50).
			SetMinPoolSize(10).
			SetMaxConnIdleTime(5 * time.Minute).
			SetServerSelectionTimeout(5 * time.Second).
			SetConnectTimeout(10 * time.Second)

		// Log the MongoDB URI (with masked password) for debugging
		if attempt == 1 {
			log.Printf("🔌 Connecting to MongoDB: %s", cfg.GetMongoURI())
		} else {
			log.Printf("🔄 Retry %d/%d: Connecting to MongoDB...", attempt, maxRetries)
		}

		client, err = mongo.Connect(ctx, clientOpts)
		cancel()

		if err != nil {
			log.Printf("   ⚠️  Attempt %d failed: %v", attempt, err)
			if attempt < maxRetries {
				time.Sleep(retryDelay)
				retryDelay *= 2 // Exponential backoff
			}
			continue
		}

		// Ping the primary to verify the connection is alive
		pingCtx, pingCancel := context.WithTimeout(context.Background(), 5*time.Second)
		err = client.Ping(pingCtx, readpref.Primary())
		pingCancel()

		if err == nil {
			// Success!
			Client = client
			DB = client.Database(cfg.DBName)
			log.Printf("✅ MongoDB connected successfully to database: %s", cfg.DBName)

			// Create indexes in background
			go createIndexes()

			return
		}

		log.Printf("   ⚠️  Ping failed (attempt %d): %v", attempt, err)
		if attempt < maxRetries {
			time.Sleep(retryDelay)
			retryDelay *= 2
		}
	}

	// All retries exhausted
	log.Fatalf("❌ MongoDB connection failed after %d attempts\n"+
		"🔧 TROUBLESHOOTING:\n"+
		"   1. Check MONGO_URI in .env or environment variables\n"+
		"   2. Whitelist IP 0.0.0.0/0 in MongoDB Atlas Network Access\n"+
		"   3. Verify database user credentials (username/password)\n"+
		"   4. Ensure database user has read/write permissions\n"+
		"   5. Add &tls=true&authMechanism=SCRAM-SHA-256 if using Atlas", maxRetries)
}

// ═══════════════════════════════════════
// 📇 CREATE INDEXES
// ═══════════════════════════════════════

func createIndexes() {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	log.Println("📇 Verifying/Creating database indexes...")

	var totalCreated, totalErrors int

	// ═══════════════════════════════════════
	// INSTALLMENTS INDEXES
	// ═══════════════════════════════════════
	installmentIndexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "customer_id", Value: 1}}},
		{Keys: bson.D{{Key: "status", Value: 1}}},
		{Keys: bson.D{{Key: "product_id", Value: 1}}},
		{Keys: bson.D{{Key: "installments.due_date", Value: 1}}},
		{
			Keys: bson.D{
				{Key: "installments.due_date", Value: 1},
				{Key: "installments.paid", Value: 1},
			},
		},
		{Keys: bson.D{{Key: "created_at", Value: -1}}},
	}
	c, e := createCollectionIndexes(ctx, ColInstallments, installmentIndexes)
	totalCreated += c
	totalErrors += e

	// ═══════════════════════════════════════
	// CUSTOMERS INDEXES
	// ═══════════════════════════════════════
	customerIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "phone", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{Keys: bson.D{{Key: "name", Value: 1}}},
		{Keys: bson.D{{Key: "account_no", Value: 1}}},
		{Keys: bson.D{{Key: "cnic", Value: 1}}},
		{Keys: bson.D{{Key: "created_at", Value: -1}}},
	}
	c, e = createCollectionIndexes(ctx, ColCustomers, customerIndexes)
	totalCreated += c
	totalErrors += e

	// ═══════════════════════════════════════
	// PRODUCTS INDEXES
	// ═══════════════════════════════════════
	productIndexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "name", Value: 1}}},
		{Keys: bson.D{{Key: "category", Value: 1}}},
		{
			Keys:    bson.D{{Key: "sku", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{Keys: bson.D{{Key: "serial_number", Value: 1}}},
	}
	c, e = createCollectionIndexes(ctx, ColProducts, productIndexes)
	totalCreated += c
	totalErrors += e

	// ═══════════════════════════════════════
	// INVENTORY INDEXES
	// ═══════════════════════════════════════
	inventoryIndexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "product_id", Value: 1}}},
		{Keys: bson.D{{Key: "status", Value: 1}}},
		{
			Keys: bson.D{
				{Key: "product_id", Value: 1},
				{Key: "status", Value: 1},
			},
		},
	}
	c, e = createCollectionIndexes(ctx, ColInventory, inventoryIndexes)
	totalCreated += c
	totalErrors += e

	// ═══════════════════════════════════════
	// AUDIT LOGS INDEXES
	// ═══════════════════════════════════════
	auditIndexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "timestamp", Value: -1}}},
		{Keys: bson.D{{Key: "user_id", Value: 1}}},
		{Keys: bson.D{{Key: "action", Value: 1}}},
		{Keys: bson.D{{Key: "entity_id", Value: 1}}},
	}
	c, e = createCollectionIndexes(ctx, ColAuditLogs, auditIndexes)
	totalCreated += c
	totalErrors += e

	// ═══════════════════════════════════════
	// PAYMENTS INDEXES
	// ═══════════════════════════════════════
	paymentIndexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "plan_id", Value: 1}}},
		{Keys: bson.D{{Key: "transaction_date", Value: -1}}},
		{Keys: bson.D{{Key: "payment_date", Value: -1}}},
		{Keys: bson.D{{Key: "installment_no", Value: 1}}},
		{Keys: bson.D{{Key: "method", Value: 1}}},
	}
	c, e = createCollectionIndexes(ctx, ColPayments, paymentIndexes)
	totalCreated += c
	totalErrors += e

	// ═══════════════════════════════════════
	// GUARANTORS INDEXES
	// ═══════════════════════════════════════
	guarantorIndexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "customer_id", Value: 1}}},
		{Keys: bson.D{{Key: "phone", Value: 1}}},
		{Keys: bson.D{{Key: "cnic", Value: 1}}},
	}
	c, e = createCollectionIndexes(ctx, ColGuarantors, guarantorIndexes)
	totalCreated += c
	totalErrors += e

	// ═══════════════════════════════════════
	// USERS INDEXES
	// ═══════════════════════════════════════
	userIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "username", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{Keys: bson.D{{Key: "role", Value: 1}}},
	}
	c, e = createCollectionIndexes(ctx, ColUsers, userIndexes)
	totalCreated += c
	totalErrors += e

	// ═══════════════════════════════════════
	// NOTIFICATIONS INDEXES
	// ═══════════════════════════════════════
	notificationIndexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "customer_id", Value: 1}}},
		{Keys: bson.D{{Key: "status", Value: 1}}},
		{Keys: bson.D{{Key: "created_at", Value: -1}}},
		{Keys: bson.D{{Key: "due_date", Value: 1}}},
	}
	c, e = createCollectionIndexes(ctx, ColNotifications, notificationIndexes)
	totalCreated += c
	totalErrors += e

	// ═══════════════════════════════════════
	// ACCOUNTING INDEXES
	// ═══════════════════════════════════════
	accountingIndexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "transaction_date", Value: -1}}},
		{Keys: bson.D{{Key: "type", Value: 1}}},
		{Keys: bson.D{{Key: "plan_id", Value: 1}}},
		{Keys: bson.D{{Key: "customer_id", Value: 1}}},
	}
	c, e = createCollectionIndexes(ctx, ColAccounting, accountingIndexes)
	totalCreated += c
	totalErrors += e

	// ═══════════════════════════════════════
	// SUMMARY
	// ═══════════════════════════════════════
	log.Printf("📇 Indexes: %d created/verified, %d errors", totalCreated, totalErrors)
}

// ═══════════════════════════════════════
// 🔧 INDEX HELPER
// ═══════════════════════════════════════

func createCollectionIndexes(ctx context.Context, collectionName string, indexes []mongo.IndexModel) (created int, errors int) {
	coll := DB.Collection(collectionName)
	names, err := coll.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		log.Printf("   ⚠️  Failed to create indexes for '%s': %v", collectionName, err)
		return 0, 1
	}
	log.Printf("   ✅ %s: %d indexes verified", collectionName, len(names))
	return len(names), 0
}

// ═══════════════════════════════════════
// 📦 UTILITY FUNCTIONS
// ═══════════════════════════════════════

// GetCollection returns a collection from the database
func GetCollection(name string) *mongo.Collection {
	return DB.Collection(name)
}

// HealthCheck checks if the database is reachable
func HealthCheck() error {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	return Client.Ping(ctx, readpref.Primary())
}

// IsConnected returns true if the database is connected
func IsConnected() bool {
	if Client == nil {
		return false
	}
	return HealthCheck() == nil
}
