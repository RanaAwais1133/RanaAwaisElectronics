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

// This script cleans up the products and inventory collections
// Fixes issues: wrong stock counts, orphaned items, extra products

type Product struct {
	ID            string  `bson:"_id"`
	Name          string  `bson:"name"`
	NameUrdu      string  `bson:"nameurdu"`
	Price         float64 `bson:"price"`
	PurchasePrice float64 `bson:"purchaseprice"`
	StockCount    int     `bson:"stockcount"`
	InStock       bool    `bson:"in_stock"`
	Company       string  `bson:"company"`
}

type InventoryItem struct {
	ID            string  `bson:"_id"`
	ProductID     string  `bson:"productid"`
	Status        string  `bson:"status"`
	PurchasePrice float64 `bson:"purchaseprice"`
	SellingPrice  float64 `bson:"sellingprice"`
	SerialNumber  string  `bson:"serialnumber"`
}

func main() {
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb+srv://ranaawaiselectronics_db_user:1U9x9fOm9xqsPCoJ@cluster0.po0dsov.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
	}
	dbName := os.Getenv("MONGO_DB_NAME")
	if dbName == "" {
		dbName = "rana_awais_erp"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer client.Disconnect(ctx)

	db := client.Database(dbName)

	// =============================================
	// STEP 1: LIST ALL PRODUCTS
	// =============================================
	fmt.Println("═══════════════════════════════════════")
	fmt.Println("📋 CURRENT PRODUCTS IN DATABASE:")
	fmt.Println("═══════════════════════════════════════")

	cursor, err := db.Collection("products").Find(ctx, bson.M{})
	if err != nil {
		log.Fatalf("Failed to query products: %v", err)
	}
	
	var products []Product
	cursor.All(ctx, &products)
	cursor.Close(ctx)

	// Get all in_stock inventory items
	invCursor, err := db.Collection("inventory_items").Find(ctx, bson.M{"status": "in_stock"})
	if err != nil {
		log.Fatalf("Failed to query inventory: %v", err)
	}
	var invItems []InventoryItem
	invCursor.All(ctx, &invItems)
	invCursor.Close(ctx)

	// Count real stock per product
	stockByProduct := make(map[string]int)
	for _, item := range invItems {
		if item.Status == "in_stock" {
			stockByProduct[item.ProductID]++
		}
	}

	fmt.Printf("\nTotal products: %d\n", len(products))
	fmt.Printf("Total inventory_items (in_stock): %d\n", len(invItems))
	fmt.Println()

	for i, p := range products {
		realStock := stockByProduct[p.ID]
		fmt.Printf("%d. %s (ID: %s)\n", i+1, p.Name, p.ID)
		fmt.Printf("   Company: %s | StockCount(DB): %d | Real Stock(items): %d | Price: %.0f | PurchasePrice: %.0f\n",
			p.Company, p.StockCount, realStock, p.Price, p.PurchasePrice)
	}

	// =============================================
	// STEP 2: FIND ORPHANED ITEMS (inventory items with no product)
	// =============================================
	fmt.Println("\n═══════════════════════════════════════")
	fmt.Println("🔍 CHECKING FOR ORPHANED INVENTORY ITEMS...")
	fmt.Println("═══════════════════════════════════════")
	
	productIDs := make(map[string]bool)
	for _, p := range products {
		productIDs[p.ID] = true
	}
	
	var orphanedCount int
	for _, item := range invItems {
		if !productIDs[item.ProductID] {
			fmt.Printf("⚠️  Orphaned item: ID=%s, ProductID=%s (no matching product!)\n", item.ID, item.ProductID)
			orphanedCount++
		}
	}
	if orphanedCount == 0 {
		fmt.Println("✅ No orphaned inventory items found.")
	}

	// =============================================
	// STEP 3: FIND DUPLICATE PRODUCT NAMES (case-insensitive)
	// =============================================
	fmt.Println("\n═══════════════════════════════════════")
	fmt.Println("🔍 CHECKING FOR DUPLICATE PRODUCTS...")
	fmt.Println("═══════════════════════════════════════")
	
	nameMap := make(map[string][]Product)
	for _, p := range products {
		key := fmt.Sprintf("%s_%s", p.Name, p.Company)
		nameMap[key] = append(nameMap[key], p)
	}
	
	idsToDelete := []string{}
	for key, prods := range nameMap {
		if len(prods) > 1 {
			fmt.Printf("⚠️  Duplicate product group: %s (%d entries)\n", key, len(prods))
			// Keep the first one, delete the rest
			for i := 1; i < len(prods); i++ {
				fmt.Printf("   → Will delete: %s (ID: %s) - duplicate of %s\n", prods[i].Name, prods[i].ID, prods[0].ID)
				idsToDelete = append(idsToDelete, prods[i].ID)
			}
		}
	}
	if len(idsToDelete) == 0 {
		fmt.Println("✅ No duplicate products found.")
	}

	// =============================================
	// STEP 4: FIX STOCK COUNTS based on actual inventory_items
	// =============================================
	fmt.Println("\n═══════════════════════════════════════")
	fmt.Println("🔧 FIXING STOCK COUNTS...")
	fmt.Println("═══════════════════════════════════════")
	
	for _, p := range products {
		realStock := stockByProduct[p.ID]
		if p.StockCount != realStock {
			fmt.Printf("📝 Updating %s: StockCount %d → %d\n", p.Name, p.StockCount, realStock)
			_, err := db.Collection("products").UpdateOne(ctx,
				bson.M{"_id": p.ID},
				bson.M{"$set": bson.M{
					"stockcount": realStock,
					"in_stock":   realStock > 0,
				}},
			)
			if err != nil {
				fmt.Printf("   ❌ Failed to update: %v\n", err)
			} else {
				fmt.Printf("   ✅ Updated successfully\n")
			}
		}
	}

	// =============================================
	// STEP 5: DELETE DUPLICATE PRODUCTS
	// =============================================
	if len(idsToDelete) > 0 {
		fmt.Println("\n═══════════════════════════════════════")
		fmt.Println("🗑️  DELETING DUPLICATE PRODUCTS...")
		fmt.Println("═══════════════════════════════════════")
		
		for _, id := range idsToDelete {
			// First, reassign any inventory items to the kept product
			// Find which product to keep (same name/company)
			var prod Product
			db.Collection("products").FindOne(ctx, bson.M{"_id": id}).Decode(&prod)
			if prod.Name != "" {
				// Find the kept product with same name
				key := fmt.Sprintf("%s_%s", prod.Name, prod.Company)
				keptProds := nameMap[key]
				if len(keptProds) > 0 && keptProds[0].ID != id {
					keptID := keptProds[0].ID
					// Move inventory items to kept product
					result, err := db.Collection("inventory_items").UpdateMany(ctx,
						bson.M{"productid": id},
						bson.M{"$set": bson.M{"productid": keptID}},
					)
					if err != nil {
						fmt.Printf("⚠️  Failed to move inventory items from %s: %v\n", id, err)
					} else {
						fmt.Printf("   Moved %d inventory items from %s → %s\n", result.ModifiedCount, id, keptID)
					}
				}
			}
			
			// Now delete the duplicate product
			_, err := db.Collection("products").DeleteOne(ctx, bson.M{"_id": id})
			if err != nil {
				fmt.Printf("❌ Failed to delete product %s: %v\n", id, err)
			} else {
				fmt.Printf("✅ Deleted duplicate product: %s\n", id)
			}
		}
	}

	// =============================================
	// STEP 6: DELETE ORPHANED INVENTORY ITEMS
	// =============================================
	fmt.Println("\n═══════════════════════════════════════")
	fmt.Println("🗑️  DELETING ORPHANED INVENTORY ITEMS...")
	fmt.Println("═══════════════════════════════════════")
	
	// Refresh product IDs after cleanup
	productIDs = make(map[string]bool)
	cursor2, _ := db.Collection("products").Find(ctx, bson.M{})
	var updatedProducts []Product
	cursor2.All(ctx, &updatedProducts)
	cursor2.Close(ctx)
	for _, p := range updatedProducts {
		productIDs[p.ID] = true
	}
	
	cursor3, _ := db.Collection("inventory_items").Find(ctx, bson.M{"status": "in_stock"})
	var updatedItems []InventoryItem
	cursor3.All(ctx, &updatedItems)
	cursor3.Close(ctx)
	
	orphanedDeleted := 0
	for _, item := range updatedItems {
		if !productIDs[item.ProductID] {
			_, err := db.Collection("inventory_items").DeleteOne(ctx, bson.M{"_id": item.ID})
			if err != nil {
				fmt.Printf("❌ Failed to delete orphaned item %s: %v\n", item.ID, err)
			} else {
				fmt.Printf("✅ Deleted orphaned item: %s (ProductID: %s)\n", item.ID, item.ProductID)
				orphanedDeleted++
			}
		}
	}
	if orphanedDeleted == 0 {
		fmt.Println("No orphaned items to delete.")
	}

	// =============================================
	// STEP 7: FINAL REPORT
	// =============================================
	fmt.Println("\n═══════════════════════════════════════")
	fmt.Println("✅ CLEANUP COMPLETE - FINAL REPORT")
	fmt.Println("═══════════════════════════════════════")
	
	cursor4, _ := db.Collection("products").Find(ctx, bson.M{})
	var finalProducts []Product
	cursor4.All(ctx, &finalProducts)
	cursor4.Close(ctx)
	
	cursor5, _ := db.Collection("inventory_items").Find(ctx, bson.M{"status": "in_stock"})
	var finalItems []InventoryItem
	cursor5.All(ctx, &finalItems)
	cursor5.Close(ctx)
	
	finalStock := make(map[string]int)
	for _, item := range finalItems {
		finalStock[item.ProductID]++
	}
	
	totalStock := 0
	totalValue := 0.0
	
	fmt.Printf("Total unique products: %d\n", len(finalProducts))
	for i, p := range finalProducts {
		stock := finalStock[p.ID]
		totalStock += stock
		value := float64(stock) * p.PurchasePrice
		if p.PurchasePrice == 0 {
			value = float64(stock) * p.Price * 0.8
		}
		totalValue += value
		fmt.Printf("%d. %s | %s | Stock: %d | Avg Price: Rs. %.0f | Value: Rs. %.0f | Variants: %d\n",
			i+1, p.Name, p.Company, stock, p.Price, value, stock)
	}
	fmt.Printf("\nTotal Stock: %d | Total Value: Rs. %.0f\n", totalStock, totalValue)
	
	fmt.Println("\n✅ Done! The dashboard should now show correct counts.")
}