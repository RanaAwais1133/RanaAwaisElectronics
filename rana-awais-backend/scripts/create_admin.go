package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb+srv://ranaawaiselectronics_db_user:1U9x9fOm9xqsPCoJ@cluster0.po0dsov.mongodb.net/?appName=Cluster0"
	}

	dbName := os.Getenv("MONGO_DB_NAME")
	if dbName == "" {
		dbName = "rana_awais_erp"
	}

	username := os.Getenv("ADMIN_USERNAME")
	if username == "" {
		username = "admin"
	}

	password := os.Getenv("ADMIN_PASSWORD")
	if password == "" {
		password = "admin123"
	}

	fmt.Println("🔌 Connecting to MongoDB Atlas...")
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
	fmt.Println("✅ MongoDB Atlas connected")

	db := client.Database(dbName)
	usersColl := db.Collection("users")

	// Delete existing admin user
	_, err = usersColl.DeleteMany(ctx, map[string]interface{}{"username": username})
	if err != nil {
		log.Printf("⚠️  Failed to delete existing users: %v", err)
	}

	// Create admin user
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("❌ Failed to hash password: %v", err)
	}

	_, err = usersColl.InsertOne(ctx, map[string]interface{}{
		"id":           "admin-default-id",
		"username":     username,
		"passwordhash": string(hash),
		"role":         "admin",
		"displayname":  "Admin",
		"phone":        "",
		"createdat":    time.Now(),
		"updatedat":    time.Now(),
	})
	if err != nil {
		log.Fatalf("❌ Failed to create admin: %v", err)
	}

	fmt.Printf("✅ Admin user created: %s / %s\n", username, password)

	// Test login
	fmt.Println("\n🔐 Testing login...")
	loginBody, _ := json.Marshal(map[string]string{
		"username": username,
		"password": password,
	})

	resp, err := http.Post(
		"http://localhost:8080/api/auth/login",
		"application/json",
		bytes.NewReader(loginBody),
	)
	if err != nil {
		log.Printf("⚠️  Login test failed: %v", err)
		return
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	if resp.StatusCode == 200 {
		fmt.Println("✅ Login test SUCCESSFUL!")
		fmt.Printf("   Token: %s\n", result["token"])
	} else {
		fmt.Printf("❌ Login test failed: %s\n", string(loginBody))
		fmt.Printf("   Response: %v\n", result)
	}
}
