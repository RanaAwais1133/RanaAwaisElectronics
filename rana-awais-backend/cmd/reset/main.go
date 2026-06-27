package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/your-org/rana-awais-backend/config"
	"github.com/your-org/rana-awais-backend/internal/domain"
	"github.com/your-org/rana-awais-backend/internal/repository/mongo"
	"github.com/your-org/rana-awais-backend/internal/service"
)

func main() {
	cfg := config.Load()
	config.ConnectDB(cfg)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Collections to drop (all except users)
	collections := []string{
		"customers",
		"guarantors",
		"products",
		"inventory",
		"installments",
		"payments",
		"audit_logs",
		"notifications",
		"accounting",
	}

	fmt.Println("🗑️  Dropping all data collections...")
	for _, coll := range collections {
		if err := config.DB.Collection(coll).Drop(ctx); err != nil {
			log.Printf("⚠️  Warning: Failed to drop collection %s: %v", coll, err)
		} else {
			fmt.Printf("   ✅ Dropped collection: %s\n", coll)
		}
	}

	// Also drop the users collection and recreate admin
	fmt.Println("\n🗑️  Dropping users collection to recreate admin...")
	if err := config.DB.Collection("users").Drop(ctx); err != nil {
		log.Printf("⚠️  Warning: Failed to drop users collection: %v", err)
	} else {
		fmt.Println("   ✅ Dropped collection: users")
	}

	// Recreate admin user
	fmt.Println("\n👤 Creating admin user...")
	userRepo := mongo.NewUserRepository()
	userSvc := service.NewUserService(userRepo)

	admin := &domain.User{
		Username:    cfg.AdminUsername,
		Role:        "admin",
		DisplayName: cfg.AdminDisplayName,
	}

	if err := userSvc.Create(ctx, admin, cfg.AdminPassword); err != nil {
		log.Fatalf("❌ Failed to create admin: %v", err)
	}

	fmt.Println("\n✅ Database reset complete!")
	fmt.Printf("   Admin username: %s\n", cfg.AdminUsername)
	fmt.Printf("   Admin password: %s\n", cfg.AdminPassword)
	fmt.Println("\n📋 All collections have been cleared.")
	fmt.Println("   You can now restart the server and login again.")
	fmt.Println("   Indexes will be recreated automatically by the server on startup.")

	time.Sleep(500 * time.Millisecond)
}
