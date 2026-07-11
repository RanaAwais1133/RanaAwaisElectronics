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
	mongoURI := "mongodb+srv://ranaawaiselectronics_db_user:1U9x9fOm9xqsPCoJ@cluster0.po0dsov.mongodb.net/?appName=Cluster0"

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("❌ Failed to connect: %v", err)
	}
	defer client.Disconnect(ctx)

	// Create admin in BOTH databases
	databases := []string{"rana_awais_erp", "myelectronics"}
	username := "admin"
	password := "admin123"

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("❌ Failed to hash password: %v", err)
	}

	for _, dbName := range databases {
		db := client.Database(dbName)
		usersColl := db.Collection("users")

		// Delete existing admin
		_, err = usersColl.DeleteMany(ctx, bson.M{"username": username})
		if err != nil {
			log.Printf("⚠️  Failed to delete existing users in %s: %v", dbName, err)
		}

		// Create admin
		adminUser := bson.M{
			"id":           "admin-default-id",
			"username":     username,
			"passwordhash": string(hash),
			"role":         "admin",
			"displayname":  "Admin",
			"phone":        "",
			"createdat":    time.Now(),
			"updatedat":    time.Now(),
		}

		_, err = usersColl.InsertOne(ctx, adminUser)
		if err != nil {
			log.Printf("❌ Failed to create admin in %s: %v", dbName, err)
			continue
		}

		fmt.Printf("✅ Admin created in %s\n", dbName)

		// Verify
		var verifyUser bson.M
		err = usersColl.FindOne(ctx, bson.M{"username": username}).Decode(&verifyUser)
		if err != nil {
			log.Printf("❌ Failed to verify admin in %s: %v", dbName, err)
			continue
		}

		storedHash := verifyUser["passwordhash"].(string)
		err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password))
		if err != nil {
			log.Printf("❌ Password verification FAILED in %s: %v", dbName, err)
			continue
		}

		fmt.Printf("✅ Password verification PASSED in %s!\n", dbName)
	}

	fmt.Println("\n✅ Admin login should work now on Render!")
}
