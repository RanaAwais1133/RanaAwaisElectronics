package main

import (
	"context"
	"log"
	"time"

	"github.com/your-org/rana-awais-backend/config"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func main() {
	cfg := config.Load()
	config.ConnectDB(cfg)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	db := config.DB

	// ---------- Customers ----------
	custColl := db.Collection("customers")
	custIndexes := []mongo.IndexModel{
		{Keys: bson.M{"phone": 1}, Options: nil},
		{Keys: bson.M{"created_at": -1}, Options: nil},
		{Keys: bson.M{"guarantor_ids": 1}, Options: nil},
	}
	if _, err := custColl.Indexes().CreateMany(ctx, custIndexes); err != nil {
		log.Fatal("Failed to create customer indexes:", err)
	}

	// ---------- Guarantors ----------
	guarColl := db.Collection("guarantors")
	guarIndexes := []mongo.IndexModel{
		{Keys: bson.M{"customer_id": 1}, Options: nil},
		{Keys: bson.M{"phone": 1}, Options: nil},
		{Keys: bson.M{"verification_status": 1}, Options: nil},
	}
	if _, err := guarColl.Indexes().CreateMany(ctx, guarIndexes); err != nil {
		log.Fatal("Failed to create guarantor indexes:", err)
	}

	// ---------- Products ----------
	prodColl := db.Collection("products")
	prodIndexes := []mongo.IndexModel{
		{Keys: bson.M{"name": 1}, Options: nil},
		{Keys: bson.M{"category": 1}, Options: nil},
	}
	if _, err := prodColl.Indexes().CreateMany(ctx, prodIndexes); err != nil {
		log.Fatal("Failed to create product indexes:", err)
	}

	// ---------- Inventory ----------
	invColl := db.Collection("inventory")
	invIndexes := []mongo.IndexModel{
		{Keys: bson.M{"product_id": 1}, Options: nil},
		{Keys: bson.M{"status": 1}, Options: nil},
		{Keys: bson.M{"serial_number": 1}, Options: nil},
		{Keys: bson.M{"purchase_date": -1}, Options: nil},
	}
	if _, err := invColl.Indexes().CreateMany(ctx, invIndexes); err != nil {
		log.Fatal("Failed to create inventory indexes:", err)
	}

	// ---------- Installments ----------
	instColl := db.Collection("installments")
	instIndexes := []mongo.IndexModel{
		{Keys: bson.M{"customer_id": 1}, Options: nil},
		{Keys: bson.M{"status": 1}, Options: nil},
		{Keys: bson.M{"installments.due_date": 1}, Options: nil},
		{Keys: bson.M{"created_at": -1}, Options: nil},
	}
	if _, err := instColl.Indexes().CreateMany(ctx, instIndexes); err != nil {
		log.Fatal("Failed to create installment indexes:", err)
	}

	// ---------- Payments ----------
	payColl := db.Collection("payments")
	payIndexes := []mongo.IndexModel{
		{Keys: bson.M{"installment_plan_id": 1}, Options: nil},
		{Keys: bson.M{"transaction_date": -1}, Options: nil},
	}
	if _, err := payColl.Indexes().CreateMany(ctx, payIndexes); err != nil {
		log.Fatal("Failed to create payment indexes:", err)
	}

	// ---------- Notifications ----------
	notifColl := db.Collection("notifications")
	notifIndexes := []mongo.IndexModel{
		{Keys: bson.M{"customer_id": 1}, Options: nil},
		{Keys: bson.M{"sent_at": -1}, Options: nil},
	}
	if _, err := notifColl.Indexes().CreateMany(ctx, notifIndexes); err != nil {
		log.Fatal("Failed to create notification indexes:", err)
	}

	// ---------- Accounting ----------
	accColl := db.Collection("accounting")
	accIndexes := []mongo.IndexModel{
		{Keys: bson.M{"basis": 1, "date": -1}, Options: nil},
	}
	if _, err := accColl.Indexes().CreateMany(ctx, accIndexes); err != nil {
		log.Fatal("Failed to create accounting indexes:", err)
	}

	log.Println("✅ All database indexes created successfully!")
}