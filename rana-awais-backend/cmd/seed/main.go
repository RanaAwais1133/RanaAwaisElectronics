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

	userRepo := mongo.NewUserRepository()
	userSvc := service.NewUserService(userRepo)

	// Check if admin exists
	existing, _ := userRepo.GetByUsername(context.Background(), "admin")
	if existing != nil {
		fmt.Println("Admin user already exists")
		return
	}

	admin := &domain.User{
		Username:    "admin",
		Role:        "admin",
		DisplayName: "Admin",
	}

	if err := userSvc.Create(context.Background(), admin, "admin123"); err != nil {
		log.Fatalf("Failed to create admin: %v", err)
	}

	fmt.Println("✅ Admin user created successfully!")
	fmt.Println("   Username: admin")
	fmt.Println("   Password: admin123")

	time.Sleep(500 * time.Millisecond)
}
