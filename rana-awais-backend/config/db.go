package config

import (
	"context"
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository/sqlite"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

// ═══════════════════════════════════════
// 📦 GLOBAL VARIABLES
// ═══════════════════════════════════════

// DB holds the active SQLite database connection.
var DB *sql.DB

// MongoClient holds the active MongoDB client connection.
var MongoClient *mongo.Client

// MongoDatabase holds the active MongoDB database instance.
var MongoDatabase *mongo.Database

// ═══════════════════════════════════════
// 🔌 CONNECT TO DATABASE
// ═══════════════════════════════════════

// ConnectDB establishes a connection to SQLite database.
func ConnectDB(cfg *Config) {
	var err error

	// Determine database path
	dbPath := cfg.SQLitePath
	if dbPath == "" {
		dbPath = getEnv("SQLITE_PATH", "./rana-awais.db")
	}

	// Ensure directory exists
	dbDir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		log.Printf("⚠️  Could not create database directory: %v", err)
	}

	log.Printf("🔌 Connecting to SQLite: %s", dbPath)

	// Connect to SQLite with WAL mode for better concurrency
	DB, err = sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_busy_timeout=5000&_foreign_keys=on")
	if err != nil {
		log.Fatalf("❌ Failed to open SQLite database: %v", err)
	}

	// Configure connection pool
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)
	DB.SetConnMaxLifetime(5 * time.Minute)

	// Test connection
	if err := DB.Ping(); err != nil {
		log.Fatalf("❌ Failed to ping SQLite database: %v", err)
	}

	log.Printf("✅ SQLite connected successfully: %s", dbPath)

	// Initialize schema
	if err := sqlite.InitSchema(DB); err != nil {
		log.Fatalf("❌ Failed to initialize database schema: %v", err)
	}

	// Run first-time setup
	runFirstTimeSetup(DB, cfg)
}

// ═══════════════════════════════════════
// 🔌 CONNECT TO MONGODB ATLAS
// ═══════════════════════════════════════

// ConnectMongoDB establishes a connection to MongoDB Atlas.
func ConnectMongoDB(cfg *Config) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	log.Printf("🔌 Connecting to MongoDB Atlas: %s/%s", cfg.MongoURI, cfg.MongoDBName)

	// Set up MongoDB client options
	clientOptions := options.Client().ApplyURI(cfg.MongoURI)

	// Connect to MongoDB
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Fatalf("❌ Failed to connect to MongoDB: %v", err)
	}

	// Test connection
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("❌ Failed to ping MongoDB: %v", err)
	}

	log.Printf("✅ MongoDB Atlas connected successfully: %s/%s", cfg.MongoURI, cfg.MongoDBName)

	// Set global variables
	MongoClient = client
	MongoDatabase = client.Database(cfg.MongoDBName)

	// Create indexes for better performance
	createMongoIndexes(ctx)

	// Run first-time setup for MongoDB
	runMongoFirstTimeSetup(ctx, cfg)

	// ═══════════════════════════════════════
	// Also connect SQLite for sync log tracking
	// ═══════════════════════════════════════
	connectSyncSQLite(cfg)
}

// connectSyncSQLite opens a SQLite connection solely for sync log tracking
func connectSyncSQLite(cfg *Config) {
	dbPath := cfg.SQLitePath
	if dbPath == "" {
		dbPath = getEnv("SQLITE_PATH", "./rana-awais.db")
	}

	// Ensure directory exists
	dbDir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		log.Printf("⚠️  Could not create sync db directory: %v", err)
	}

	log.Printf("🔌 Connecting sync SQLite: %s", dbPath)

	var err error
	DB, err = sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_busy_timeout=5000&_foreign_keys=on")
	if err != nil {
		log.Printf("⚠️  Failed to open sync SQLite database: %v", err)
		return
	}

	// Configure connection pool
	DB.SetMaxOpenConns(5)
	DB.SetMaxIdleConns(2)
	DB.SetConnMaxLifetime(5 * time.Minute)

	// Test connection
	if err := DB.Ping(); err != nil {
		log.Printf("⚠️  Failed to ping sync SQLite database: %v", err)
		DB = nil
		return
	}

	log.Printf("✅ Sync SQLite connected successfully: %s", dbPath)

	// Create sync_logs table if not exists
	_, err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS sync_logs (
			id TEXT PRIMARY KEY,
			entity TEXT NOT NULL,
			entity_id TEXT NOT NULL,
			operation TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'pending',
			error TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			last_attempt DATETIME,
			synced_at DATETIME,
			retry_count INTEGER DEFAULT 0
		)
	`)
	if err != nil {
		log.Printf("⚠️  Failed to create sync_logs table: %v", err)
	}
}


// createMongoIndexes creates indexes for MongoDB collections
func createMongoIndexes(ctx context.Context) {
	if MongoDatabase == nil {
		return
	}

	// Customers indexes
	customersColl := MongoDatabase.Collection("customers")
	customersColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: map[string]interface{}{"phone": 1},
	})
	customersColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: map[string]interface{}{"cnic": 1},
	})

	// Installment plans indexes
	plansColl := MongoDatabase.Collection("installment_plans")
	plansColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: map[string]interface{}{"customerid": 1},
	})
	plansColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: map[string]interface{}{"status": 1},
	})

	// Installment details indexes
	detailsColl := MongoDatabase.Collection("installment_details")
	detailsColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: map[string]interface{}{"plan_id": 1},
	})
	detailsColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: map[string]interface{}{"due_date": 1, "paid": 1},
	})

	// Payments indexes
	paymentsColl := MongoDatabase.Collection("payments")
	paymentsColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: map[string]interface{}{"installmentplanid": 1},
	})
	paymentsColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: map[string]interface{}{"transactiondate": 1},
	})

	// Users indexes
	usersColl := MongoDatabase.Collection("users")
	usersColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    map[string]interface{}{"username": 1},
		Options: options.Index().SetUnique(true),
	})

	log.Println("✅ MongoDB indexes created successfully")
}

// CloseMongoDB closes the MongoDB connection
func CloseMongoDB() {
	if MongoClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := MongoClient.Disconnect(ctx); err != nil {
			log.Printf("⚠️  Error disconnecting MongoDB: %v", err)
		} else {
			log.Println("✅ MongoDB connection closed")
		}
	}
}


// ═══════════════════════════════════════
// 🚀 FIRST-TIME SETUP (MongoDB)
// ═══════════════════════════════════════

func runMongoFirstTimeSetup(ctx context.Context, cfg *Config) {
	if MongoDatabase == nil {
		return
	}

	usersColl := MongoDatabase.Collection("users")

	// Check if any users exist
	count, err := usersColl.CountDocuments(ctx, map[string]interface{}{})
	if err != nil {
		log.Printf("⚠️  Error checking users in MongoDB: %v", err)
		return
	}

	// If no users, create default admin
	if count == 0 {
		log.Println("👤 No users found in MongoDB. Creating default admin user...")
		hashedPassword := hashPassword(cfg.AdminPassword)
		_, err := usersColl.InsertOne(ctx, map[string]interface{}{
			"id":           "admin-default-id",
			"username":     cfg.AdminUsername,
			"passwordhash": hashedPassword,
			"role":         "admin",
			"displayname":  cfg.AdminDisplayName,
			"phone":        "",
			"createdat":    time.Now(),
			"updatedat":    time.Now(),
		})
		if err != nil {
			log.Printf("⚠️  Failed to create admin user in MongoDB: %v", err)
			return
		}
		log.Printf("✅ Default admin user created: %s / %s", cfg.AdminUsername, cfg.AdminPassword)
	}
}

// ═══════════════════════════════════════
// 🚀 FIRST-TIME SETUP (SQLite)
// ═══════════════════════════════════════

func runFirstTimeSetup(db *sql.DB, cfg *Config) {

	// 1. Check if any users exist
	var userCount int
	err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount)
	if err != nil {
		log.Printf("⚠️  Error checking users: %v", err)
		return
	}

	// 2. If no users, create default admin
	if userCount == 0 {
		log.Println("👤 No users found. Creating default admin user...")
		createDefaultAdmin(db, cfg)
	}

	// 3. Check if license exists
	var licenseCount int
	err = db.QueryRow("SELECT COUNT(*) FROM license").Scan(&licenseCount)
	if err != nil {
		log.Printf("⚠️  Error checking license: %v", err)
		return
	}

	// 4. If no license, create 30-day trial
	if licenseCount == 0 {
		log.Println("🔑 No license found. Creating 30-day trial license...")
		createTrialLicense(db)
	}
}

func createDefaultAdmin(db *sql.DB, cfg *Config) {
	// Use bcrypt to hash the password
	hashedPassword := hashPassword(cfg.AdminPassword)

	_, err := db.Exec(`
		INSERT INTO users (id, username, password_hash, role, display_name, phone, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		"admin-default-id", cfg.AdminUsername, hashedPassword, "admin", cfg.AdminDisplayName, "", time.Now(), time.Now())
	if err != nil {
		log.Printf("⚠️  Failed to create admin user: %v", err)
		return
	}
	log.Printf("✅ Default admin user created: %s / %s", cfg.AdminUsername, cfg.AdminPassword)
}

func createTrialLicense(db *sql.DB) {
	expiryDate := time.Now().AddDate(0, 1, 0).Format("2006-01-02") // 1 month trial
	_, err := db.Exec(`
		INSERT INTO license (license_key, client_name, expiry_date, is_active, created_at)
		VALUES (?, ?, ?, ?, ?)`,
		"TRIAL-30-DAYS", "Trial User", expiryDate, 1, time.Now())
	if err != nil {
		log.Printf("⚠️  Failed to create trial license: %v", err)
		return
	}
	log.Printf("✅ 30-day trial license created (expires: %s)", expiryDate)
}

// hashPassword hashes a password using bcrypt
func hashPassword(password string) string {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("⚠️  Failed to hash password: %v", err)
		return password // Fallback to plain text (should never happen)
	}
	return string(hash)
}

// ═══════════════════════════════════════
// 📦 UTILITY FUNCTIONS
// ═══════════════════════════════════════

// HealthCheck checks if the database is reachable
func HealthCheck() error {
	if DB == nil {
		return nil // In MongoDB mode, SQLite is optional (sync only)
	}
	return DB.Ping()
}

// IsConnected returns true if the database is connected
func IsConnected() bool {
	if DB == nil {
		return false
	}
	return DB.Ping() == nil
}
