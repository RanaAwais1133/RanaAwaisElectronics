// ═══════════════════════════════════════════════════════════════
// ✅ MongoDB Index Creator - Performance Optimization
// ✅ Run: go run scripts/create_indexes.go
// ═══════════════════════════════════════════════════════════════
// This script creates all necessary MongoDB indexes for optimal
// query performance. Run it once after deploying to MongoDB Atlas.
// ═══════════════════════════════════════════════════════════════

//go:build ignore
// +build ignore

package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	log.Println("🚀 Creating MongoDB indexes for performance optimization...")

	// Load config
	cfg := config.Load()
	cfg.UseMongoDB = true

	// Connect to MongoDB
	config.ConnectMongoDB(cfg)
	if config.MongoDatabase == nil {
		log.Fatal("❌ Failed to connect to MongoDB")
	}
	defer config.CloseMongoDB()

	db := config.MongoDatabase
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// ═══════════════════════════════════════
	// 1️⃣ CUSTOMERS COLLECTION INDEXES
	// ═══════════════════════════════════════
	log.Println("📊 Creating customers indexes...")
	customers := db.Collection("customers")

	// Unique index on phone
	_, err := customers.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "phone", Value: 1}},
		Options: options.Index().SetUnique(true).SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  customers phone index: %v", err)
	}

	// Index on name for search
	_, err = customers.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "name", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  customers name index: %v", err)
	}

	// Index on nameUrdu for search
	_, err = customers.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "nameUrdu", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  customers nameUrdu index: %v", err)
	}

	// Index on cnic
	_, err = customers.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "cnic", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  customers cnic index: %v", err)
	}

	// Compound index for search queries
	_, err = customers.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "name", Value: 1},
			{Key: "phone", Value: 1},
			{Key: "cnic", Value: 1},
		},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  customers compound index: %v", err)
	}

	fmt.Println("   ✅ Customers indexes created")

	// ═══════════════════════════════════════
	// 2️⃣ PRODUCTS COLLECTION INDEXES
	// ═══════════════════════════════════════
	log.Println("📊 Creating products indexes...")
	products := db.Collection("products")

	_, err = products.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "name", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  products name index: %v", err)
	}

	_, err = products.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "category", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  products category index: %v", err)
	}

	fmt.Println("   ✅ Products indexes created")

	// ═══════════════════════════════════════
	// 3️⃣ INSTALLMENT PLANS COLLECTION INDEXES
	// ═══════════════════════════════════════
	log.Println("📊 Creating installment_plans indexes...")
	plans := db.Collection("installment_plans")

	// Index on customerId for fast lookups
	_, err = plans.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "customerId", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  plans customerId index: %v", err)
	}

	// Index on status for filtering
	_, err = plans.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "status", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  plans status index: %v", err)
	}

	// Compound index for dashboard queries
	_, err = plans.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "status", Value: 1},
			{Key: "customerId", Value: 1},
		},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  plans compound index: %v", err)
	}

	// Index on createdAt for sorting
	_, err = plans.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "createdAt", Value: -1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  plans createdAt index: %v", err)
	}

	fmt.Println("   ✅ Installment plans indexes created")

	// ═══════════════════════════════════════
	// 4️⃣ INSTALLMENT DETAILS COLLECTION INDEXES
	// ═══════════════════════════════════════
	log.Println("📊 Creating installment_details indexes...")
	details := db.Collection("installment_details")

	// Index on planId
	_, err = details.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "planId", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  details planId index: %v", err)
	}

	// Index on dueDate for upcoming/overdue queries
	_, err = details.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "dueDate", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  details dueDate index: %v", err)
	}

	// Index on paid status
	_, err = details.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "paid", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  details paid index: %v", err)
	}

	// Compound index for dashboard queries (paid=false, dueDate range)
	_, err = details.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "paid", Value: 1},
			{Key: "dueDate", Value: 1},
		},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  details compound index: %v", err)
	}

	fmt.Println("   ✅ Installment details indexes created")

	// ═══════════════════════════════════════
	// 5️⃣ PAYMENTS COLLECTION INDEXES
	// ═══════════════════════════════════════
	log.Println("📊 Creating payments indexes...")
	payments := db.Collection("payments")

	_, err = payments.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "installmentPlanId", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  payments planId index: %v", err)
	}

	_, err = payments.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "transactionDate", Value: -1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  payments date index: %v", err)
	}

	fmt.Println("   ✅ Payments indexes created")

	// ═══════════════════════════════════════
	// 6️⃣ INVENTORY COLLECTION INDEXES
	// ═══════════════════════════════════════
	log.Println("📊 Creating inventory indexes...")
	inventory := db.Collection("inventory")

	_, err = inventory.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "productId", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  inventory productId index: %v", err)
	}

	_, err = inventory.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "serialNumber", Value: 1}},
		Options: options.Index().SetUnique(true).SetSparse(true).SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  inventory serialNumber index: %v", err)
	}

	fmt.Println("   ✅ Inventory indexes created")

	// ═══════════════════════════════════════
	// 7️⃣ GUARANTORS COLLECTION INDEXES
	// ═══════════════════════════════════════
	log.Println("📊 Creating guarantors indexes...")
	guarantors := db.Collection("guarantors")

	_, err = guarantors.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "customerId", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  guarantors customerId index: %v", err)
	}

	_, err = guarantors.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "phone", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  guarantors phone index: %v", err)
	}

	fmt.Println("   ✅ Guarantors indexes created")

	// ═══════════════════════════════════════
	// 8️⃣ USERS COLLECTION INDEXES
	// ═══════════════════════════════════════
	log.Println("📊 Creating users indexes...")
	users := db.Collection("users")

	_, err = users.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "username", Value: 1}},
		Options: options.Index().SetUnique(true).SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  users username index: %v", err)
	}

	fmt.Println("   ✅ Users indexes created")

	// ═══════════════════════════════════════
	// 9️⃣ PROMISES COLLECTION INDEXES
	// ═══════════════════════════════════════
	log.Println("📊 Creating promises indexes...")
	promises := db.Collection("promises")

	_, err = promises.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "planId", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  promises planId index: %v", err)
	}

	_, err = promises.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "promiseDate", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  promises date index: %v", err)
	}

	fmt.Println("   ✅ Promises indexes created")

	// ═══════════════════════════════════════
	// 🔟 EXPENSES COLLECTION INDEXES
	// ═══════════════════════════════════════
	log.Println("📊 Creating expenses indexes...")
	expenses := db.Collection("expenses")

	_, err = expenses.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "date", Value: -1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  expenses date index: %v", err)
	}

	_, err = expenses.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "category", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	if err != nil {
		log.Printf("⚠️  expenses category index: %v", err)
	}

	fmt.Println("   ✅ Expenses indexes created")

	// ═══════════════════════════════════════
	// ✅ SUMMARY
	// ═══════════════════════════════════════
	fmt.Println()
	fmt.Println("═══════════════════════════════════════")
	fmt.Println("✅ All MongoDB indexes created successfully!")
	fmt.Println("═══════════════════════════════════════")
	fmt.Println()
	fmt.Println("📊 Indexes created for collections:")
	fmt.Println("   • customers (5 indexes)")
	fmt.Println("   • products (2 indexes)")
	fmt.Println("   • installment_plans (4 indexes)")
	fmt.Println("   • installment_details (4 indexes)")
	fmt.Println("   • payments (2 indexes)")
	fmt.Println("   • inventory (2 indexes)")
	fmt.Println("   • guarantors (2 indexes)")
	fmt.Println("   • users (1 index)")
	fmt.Println("   • promises (2 indexes)")
	fmt.Println("   • expenses (2 indexes)")
	fmt.Println()
	fmt.Println("🚀 Performance should be significantly improved!")
	fmt.Println()

	os.Exit(0)
}
