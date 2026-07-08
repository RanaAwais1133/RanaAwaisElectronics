package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ═══════════════════════════════════════
// 🔄 SQLite → MongoDB Atlas Migration Script
// ═══════════════════════════════════════
// Usage: cd rana-awais-backend && go run scripts/migrate_to_mongodb.go
//
// This script:
// 1. Reads data from the SQLite database
// 2. Connects to MongoDB Atlas
// 3. Creates collections and indexes
// 4. Migrates all data
// 5. Generates a config.json for the new setup

type MigrationConfig struct {
	SQLitePath string `json:"sqlite_path"`
	MongoURI   string `json:"mongo_uri"`
	DBName     string `json:"db_name"`
}

func main() {
	fmt.Println(strings.Repeat("═", 60))
	fmt.Println("🔄 SQLite → MongoDB Atlas Migration Tool")
	fmt.Println(strings.Repeat("═", 60))

	// Load config
	cfg := loadConfig()

	// Connect to SQLite
	fmt.Println("\n📂 Connecting to SQLite...")
	sqliteDB, err := sql.Open("sqlite3", cfg.SQLitePath)
	if err != nil {
		log.Fatalf("❌ Failed to open SQLite: %v", err)
	}
	defer sqliteDB.Close()
	fmt.Println("✅ SQLite connected")

	// Connect to MongoDB
	fmt.Println("\n🍃 Connecting to MongoDB Atlas...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.MongoURI))
	if err != nil {
		log.Fatalf("❌ Failed to connect to MongoDB: %v", err)
	}
	defer client.Disconnect(ctx)

	// Ping MongoDB
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("❌ MongoDB ping failed: %v", err)
	}
	fmt.Println("✅ MongoDB Atlas connected")

	db := client.Database(cfg.DBName)

	// ═══════════════════════════════════════
	// 📋 MIGRATE TABLES
	// ═══════════════════════════════════════

	type tableConfig struct {
		name      string
		query     string
		transform func(map[string]interface{}) map[string]interface{}
		indexes   []mongo.IndexModel
	}

	tables := []tableConfig{
		{
			name:  "users",
			query: "SELECT * FROM users",
			transform: func(row map[string]interface{}) map[string]interface{} {
				row["_id"] = row["id"]
				delete(row, "id")
				return row
			},
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "username", Value: 1}}, Options: options.Index().SetUnique(true)},
			},
		},
		{
			name:  "customers",
			query: "SELECT * FROM customers",
			transform: func(row map[string]interface{}) map[string]interface{} {
				row["_id"] = row["id"]
				delete(row, "id")
				return row
			},
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "phone", Value: 1}}},
				{Keys: bson.D{{Key: "name", Value: 1}}},
				{Keys: bson.D{{Key: "cnic", Value: 1}}},
			},
		},
		{
			name:  "guarantors",
			query: "SELECT * FROM guarantors",
			transform: func(row map[string]interface{}) map[string]interface{} {
				row["_id"] = row["id"]
				delete(row, "id")
				return row
			},
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "customer_id", Value: 1}}},
			},
		},
		{
			name:  "products",
			query: "SELECT * FROM products",
			transform: func(row map[string]interface{}) map[string]interface{} {
				row["_id"] = row["id"]
				delete(row, "id")
				return row
			},
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "name", Value: 1}}},
				{Keys: bson.D{{Key: "category", Value: 1}}},
			},
		},
		{
			name:  "inventory_items",
			query: "SELECT * FROM inventory_items",
			transform: func(row map[string]interface{}) map[string]interface{} {
				row["_id"] = row["id"]
				delete(row, "id")
				return row
			},
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "product_id", Value: 1}}},
			},
		},
		{
			name:  "installment_plans",
			query: "SELECT * FROM installment_plans",
			transform: func(row map[string]interface{}) map[string]interface{} {
				row["_id"] = row["id"]
				delete(row, "id")
				return row
			},
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "customer_id", Value: 1}}},
				{Keys: bson.D{{Key: "status", Value: 1}}},
				{Keys: bson.D{{Key: "created_at", Value: -1}}},
			},
		},
		{
			name:  "installment_details",
			query: "SELECT * FROM installment_details",
			transform: func(row map[string]interface{}) map[string]interface{} {
				row["_id"] = row["id"]
				delete(row, "id")
				return row
			},
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "plan_id", Value: 1}}},
				{Keys: bson.D{{Key: "due_date", Value: 1}}},
				{Keys: bson.D{{Key: "paid", Value: 1}}},
			},
		},
		{
			name:  "payments",
			query: "SELECT * FROM payments",
			transform: func(row map[string]interface{}) map[string]interface{} {
				row["_id"] = row["id"]
				delete(row, "id")
				return row
			},
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "installment_plan_id", Value: 1}}},
				{Keys: bson.D{{Key: "transaction_date", Value: -1}}},
			},
		},
		{
			name:  "accounting_entries",
			query: "SELECT * FROM accounting_entries",
			transform: func(row map[string]interface{}) map[string]interface{} {
				row["_id"] = row["id"]
				delete(row, "id")
				return row
			},
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "date", Value: -1}}},
				{Keys: bson.D{{Key: "type", Value: 1}}},
			},
		},
		{
			name:  "notifications",
			query: "SELECT * FROM notifications",
			transform: func(row map[string]interface{}) map[string]interface{} {
				row["_id"] = row["id"]
				delete(row, "id")
				return row
			},
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "sent", Value: 1}}},
			},
		},
		{
			name:  "settings",
			query: "SELECT * FROM settings",
			transform: func(row map[string]interface{}) map[string]interface{} {
				row["_id"] = row["key"]
				delete(row, "key")
				return row
			},
		},
		{
			name:  "license",
			query: "SELECT * FROM license",
			transform: func(row map[string]interface{}) map[string]interface{} {
				row["_id"] = row["id"]
				delete(row, "id")
				return row
			},
		},
		{
			name:  "audit_logs",
			query: "SELECT * FROM audit_logs",
			transform: func(row map[string]interface{}) map[string]interface{} {
				row["_id"] = row["id"]
				delete(row, "id")
				return row
			},
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "timestamp", Value: -1}}},
			},
		},
		{
			name:  "sync_logs",
			query: "SELECT * FROM sync_logs",
			transform: func(row map[string]interface{}) map[string]interface{} {
				row["_id"] = row["id"]
				delete(row, "id")
				return row
			},
		},
		{
			name:  "promises",
			query: "SELECT * FROM promises",
			transform: func(row map[string]interface{}) map[string]interface{} {
				row["_id"] = row["id"]
				delete(row, "id")
				return row
			},
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "plan_id", Value: 1}}},
				{Keys: bson.D{{Key: "promise_date", Value: 1}}},
			},
		},
	}

	totalMigrated := 0
	totalErrors := 0

	for _, table := range tables {
		fmt.Printf("\n📦 Migrating %s...", table.name)

		// Query SQLite
		rows, err := sqliteDB.Query(table.query)
		if err != nil {
			fmt.Printf(" ❌ Query failed: %v\n", err)
			totalErrors++
			continue
		}

		columns, err := rows.Columns()
		if err != nil {
			fmt.Printf(" ❌ Columns failed: %v\n", err)
			rows.Close()
			totalErrors++
			continue
		}

		// Read all rows
		var docs []interface{}
		count := 0
		for rows.Next() {
			vals := make([]interface{}, len(columns))
			valPtrs := make([]interface{}, len(columns))
			for i := range vals {
				valPtrs[i] = &vals[i]
			}

			if err := rows.Scan(valPtrs...); err != nil {
				fmt.Printf(" ❌ Scan failed: %v\n", err)
				continue
			}

			row := make(map[string]interface{})
			for i, col := range columns {
				val := vals[i]
				if val != nil {
					// Convert types
					switch v := val.(type) {
					case []byte:
						row[col] = string(v)
					case int64:
						row[col] = v
					case float64:
						row[col] = v
					case string:
						row[col] = v
					case bool:
						row[col] = v
					default:
						row[col] = v
					}
				}
			}

			// Apply transformation
			row = table.transform(row)
			docs = append(docs, row)
			count++
		}
		rows.Close()

		if count == 0 {
			fmt.Printf(" ⏭️  No data\n")
			continue
		}

		// Drop existing collection
		collection := db.Collection(table.name)
		collection.Drop(ctx)

		// Insert documents
		if len(docs) > 0 {
			// Insert in batches of 100
			batchSize := 100
			for i := 0; i < len(docs); i += batchSize {
				end := i + batchSize
				if end > len(docs) {
					end = len(docs)
				}
				batch := docs[i:end]
				if _, err := collection.InsertMany(ctx, batch); err != nil {
					fmt.Printf(" ❌ Insert failed: %v\n", err)
					totalErrors++
					continue
				}
			}
		}

		// Create indexes
		if len(table.indexes) > 0 {
			if _, err := collection.Indexes().CreateMany(ctx, table.indexes); err != nil {
				fmt.Printf(" ⚠️  Index creation failed: %v\n", err)
			}
		}

		fmt.Printf(" ✅ %d documents migrated\n", count)
		totalMigrated += count
	}

	fmt.Println(strings.Repeat("═", 60))
	fmt.Printf("\n📊 Migration Summary:\n")
	fmt.Printf("   ✅ Total documents migrated: %d\n", totalMigrated)
	fmt.Printf("   ❌ Errors: %d\n", totalErrors)
	fmt.Println(strings.Repeat("═", 60))

	// Generate config
	generateConfig(cfg)
}

func loadConfig() MigrationConfig {
	// Try to load from config.json
	if data, err := os.ReadFile("migration_config.json"); err == nil {
		var cfg MigrationConfig
		if json.Unmarshal(data, &cfg) == nil {
			return cfg
		}
	}

	// Default config
	return MigrationConfig{
		SQLitePath: "rana-awais.db",
		MongoURI:   "mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority",
		DBName:     "rana_awais_electronics",
	}
}

func generateConfig(cfg MigrationConfig) {
	config := map[string]interface{}{
		"use_mongodb": true,
		"mongo_uri":   cfg.MongoURI,
		"db_name":     cfg.DBName,
		"migrated_at": time.Now().Format(time.RFC3339),
		"notes":       "This config was generated by the migration script. Update the mongo_uri with your actual MongoDB Atlas connection string.",
	}

	data, _ := json.MarshalIndent(config, "", "  ")
	os.WriteFile("migration_result.json", data, 0644)
	fmt.Println("\n📄 Migration config saved to migration_result.json")
	fmt.Println("\n⚠️  IMPORTANT: Update your client-config.json with:")
	fmt.Printf(`   {
     "use_mongodb": true,
     "mongo_uri": "%s",
     "db_name": "%s"
   }`, cfg.MongoURI, cfg.DBName)
	fmt.Println()
}
