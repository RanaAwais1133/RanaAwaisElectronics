package main

import (
	"context"
	"log"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.Load()
	config.ConnectDB(cfg)

	coll := config.DB.Collection("users")
	hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	user := domain.User{
		ID:           primitive.NewObjectID(),
		Username:     "admin",
		PasswordHash: string(hash),
		Role:         "admin",
		DisplayName:  "Administrator",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	_, err := coll.InsertOne(context.Background(), user)
	if err != nil {
		log.Fatal("Failed to create admin user:", err)
	}
	log.Println("Admin user created (username: admin, password: admin123)")
}
