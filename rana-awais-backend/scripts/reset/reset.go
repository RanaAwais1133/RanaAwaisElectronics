package main

import (
	"context"
	"log"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.Load()
	config.ConnectDB(cfg)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Get all collection names
	collections, err := config.DB.ListCollectionNames(ctx, bson.M{})
	if err != nil {
		log.Fatal("Failed to list collections:", err)
	}

	log.Println("Found collections:", collections)

	// Drop all collections
	for _, name := range collections {
		if err := config.DB.Collection(name).Drop(ctx); err != nil {
			log.Printf("Failed to drop collection %s: %v", name, err)
		} else {
			log.Printf("Dropped collection: %s", name)
		}
	}

	log.Println("✅ All collections dropped!")

	// Create admin user
	coll := config.DB.Collection("users")
	hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}

	user := domain.User{
		ID:           primitive.NewObjectID(),
		Username:     "admin",
		PasswordHash: string(hash),
		Role:         "admin",
		DisplayName:  "Administrator",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	_, err = coll.InsertOne(ctx, user)
	if err != nil {
		log.Fatal("Failed to create admin user:", err)
	}

	log.Println("✅ Admin user created!")
	log.Println("   Username: admin")
	log.Println("   Password: admin123")
	log.Println("   Role: admin")
}
