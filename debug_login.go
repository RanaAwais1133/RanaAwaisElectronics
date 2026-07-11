package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	mongoURI := "mongodb+srv://ranaawaiselectronics_db_user:1U9x9fOm9xqsPCoJ@cluster0.po0dsov.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("❌ Failed to connect: %v", err)
	}
	defer client.Disconnect(ctx)

	db := client.Database("rana_awais_erp")
	usersColl := db.Collection("users")

	// Try to find user by username
	var user bson.M
	err = usersColl.FindOne(ctx, bson.M{"username": "admin"}).Decode(&user)
	if err != nil {
		log.Fatalf("❌ User not found: %v", err)
	}

	fmt.Printf("✅ User found: %+v\n", user)

	// Check password
	passwordHash := user["passwordhash"].(string)
	fmt.Printf("   Stored hash: %s\n", passwordHash)

	err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte("admin123"))
	if err != nil {
		log.Fatalf("❌ Password mismatch: %v", err)
	}

	fmt.Println("✅ Password matches!")

	// Now try with the exact same query the backend uses
	var user2 bson.M
	err = usersColl.FindOne(ctx, bson.M{"username": "admin"}).Decode(&user2)
	if err != nil {
		log.Fatalf("❌ User not found with exact query: %v", err)
	}
	fmt.Printf("✅ User found with exact query: username=%s\n", user2["username"])
}
