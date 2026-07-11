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

	// Check myelectronics database
	db := client.Database("myelectronics")
	usersColl := db.Collection("users")

	count, _ := usersColl.CountDocuments(ctx, bson.M{})
	fmt.Printf("📊 Users in myelectronics: %d\n", count)

	cursor, _ := usersColl.Find(ctx, bson.M{})
	for cursor.Next(ctx) {
		var user bson.M
		cursor.Decode(&user)
		fmt.Printf("   User: %+v\n", user)
		
		// Check password
		if hash, ok := user["passwordhash"].(string); ok {
			err := bcrypt.CompareHashAndPassword([]byte(hash), []byte("admin123"))
			if err != nil {
				fmt.Printf("   ❌ Password mismatch: %v\n", err)
			} else {
				fmt.Printf("   ✅ Password matches!\n")
			}
		}
	}
	cursor.Close(ctx)
}
