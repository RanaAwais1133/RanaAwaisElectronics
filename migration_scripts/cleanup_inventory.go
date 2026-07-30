package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	// Get MongoDB connection details from environment
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	dbName := os.Getenv("MONGO_DB_NAME")
	if dbName == "" {
		dbName = "myelectronics"
	}

	fmt.Println("🔌 Connecting to MongoDB...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("❌ Failed to connect: %v", err)
	}
	defer client.Disconnect(ctx)

	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("❌ Ping failed: %v", err)
	}
	fmt.Println("✅ MongoDB connected")

	db := client.Database(dbName)

	fmt.Println("Starting inventory cleanup migration...")

	// Step 1: Find all sold inventory items
	soldItems, err := db.Collection("inventory_items").Find(ctx, bson.M{"status": "sold"})
	if err != nil {
		log.Fatalf("Failed to find sold items: %v", err)
	}
	defer soldItems.Close(ctx)

	var soldCount int64
	productStockMap := make(map[string]int)

	// Count sold items per product
	for soldItems.Next(ctx) {
		var item bson.M
		if err := soldItems.Decode(&item); err != nil {
			continue
		}
		soldCount++
		productID := item["product_id"].(string)
		productStockMap[productID]--
	}

	fmt.Printf("Found %d sold inventory items to delete\n", soldCount)

	// Step 2: Delete all sold inventory items
	deleteResult, err := db.Collection("inventory_items").DeleteMany(ctx, bson.M{"status": "sold"})
	if err != nil {
		log.Fatalf("Failed to delete sold items: %v", err)
	}
	fmt.Printf("Deleted %d sold inventory items\n", deleteResult.DeletedCount)

	// Step 3: Find items with status "returned"
	returnedItems, err := db.Collection("inventory_items").Find(ctx, bson.M{"status": "returned"})
	if err != nil {
		log.Fatalf("Failed to find returned items: %v", err)
	}
	defer returnedItems.Close(ctx)

	var returnedCount int64
	for returnedItems.Next(ctx) {
		var item bson.M
		if err := returnedItems.Decode(&item); err != nil {
			continue
		}
		returnedCount++
		productID := item["product_id"].(string)
		productStockMap[productID]++
	}

	// Delete returned items as well
	if returnedCount > 0 {
		deleteResult, err := db.Collection("inventory_items").DeleteMany(ctx, bson.M{"status": "returned"})
		if err != nil {
			log.Fatalf("Failed to delete returned items: %v", err)
		}
		fmt.Printf("Deleted %d returned inventory items\n", deleteResult.DeletedCount)
	}

	// Step 4: Recalculate stock counts for all products based on actual in-stock inventory items
	fmt.Println("Recalculating product stock counts...")

	// Get all in-stock inventory items grouped by product
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"status": "in_stock"}}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$product_id"},
			{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
		}}},
	}

	cursor, err := db.Collection("inventory_items").Aggregate(ctx, pipeline)
	if err != nil {
		log.Fatalf("Failed to aggregate inventory: %v", err)
	}
	defer cursor.Close(ctx)

	actualStockMap := make(map[string]int)
	for cursor.Next(ctx) {
		var result struct {
			ID    string `bson:"_id"`
			Count int    `bson:"count"`
		}
		if err := cursor.Decode(&result); err != nil {
			continue
		}
		actualStockMap[result.ID] = result.Count
	}

	// Step 5: Update all products with correct stock counts
	products, err := db.Collection("products").Find(ctx, bson.M{})
	if err != nil {
		log.Fatalf("Failed to find products: %v", err)
	}
	defer products.Close(ctx)

	var updatedProducts int
	for products.Next(ctx) {
		var product bson.M
		if err := products.Decode(&product); err != nil {
			continue
		}

		productID := product["_id"].(string)
		actualStock := actualStockMap[productID]

		// Update product
		update := bson.M{
			"$set": bson.M{
				"stockcount":  actualStock,
				"instock":     actualStock > 0,
				"updatedat":   time.Now(),
			},
		}

		_, err := db.Collection("products").UpdateOne(ctx, bson.M{"_id": productID}, update)
		if err != nil {
			log.Printf("Failed to update product %s: %v", productID, err)
			continue
		}
		updatedProducts++
	}

	fmt.Printf("Updated %d products with correct stock counts\n", updatedProducts)

	// Step 6: Verify - check for any products with stockcount < 0
	negativeStock, err := db.Collection("products").CountDocuments(ctx, bson.M{"stockcount": bson.M{"$lt": 0}})
	if err != nil {
		log.Printf("Failed to check negative stock: %v", err)
	} else if negativeStock > 0 {
		log.Printf("WARNING: Found %d products with negative stock count!", negativeStock)
	}

	// Step 7: Check for products with stockcount > 0 but no inventory items
	mismatchPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"stockcount": bson.M{"$gt": 0}}}},
		{{Key: "$lookup", Value: bson.D{
			{Key: "from", Value: "inventory_items"},
			{Key: "localField", Value: "_id"},
			{Key: "foreignField", Value: "product_id"},
			{Key: "as", Value: "inventoryItems"},
			{Key: "pipeline", Value: mongo.Pipeline{
				{{Key: "$match", Value: bson.M{"status": "in_stock"}}},
			}},
		}}},
		{{Key: "$project", Value: bson.D{
			{Key: "name", Value: 1},
			{Key: "stockcount", Value: 1},
			{Key: "inventoryCount", Value: bson.D{{Key: "$size", Value: "$inventoryItems"}}},
		}}},
		{{Key: "$match", Value: bson.M{"$expr": bson.M{"$ne": []string{"$stockcount", "$inventoryCount"}}}}},
	}

	mismatchCursor, err := db.Collection("products").Aggregate(ctx, mismatchPipeline)
	if err != nil {
		log.Printf("Failed to check mismatches: %v", err)
	} else {
		var mismatchCount int
		for mismatchCursor.Next(ctx) {
			mismatchCount++
		}
		if mismatchCount > 0 {
			log.Printf("WARNING: Found %d products with stock count mismatch!", mismatchCount)
		} else {
			fmt.Println("All product stock counts match inventory items!")
		}
		mismatchCursor.Close(ctx)
	}

	fmt.Println("✅ Inventory cleanup migration completed successfully!")
}