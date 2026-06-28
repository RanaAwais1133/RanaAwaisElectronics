package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository/mongo"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
)

func main() {
	cfg := config.Load()
	config.ConnectDB(cfg)

	userRepo := mongo.NewUserRepository()
	userSvc := service.NewUserService(userRepo)

	// Check if admin exists
	existing, _ := userRepo.GetByUsername(context.Background(), cfg.AdminUsername)
	if existing != nil {
		fmt.Println("Admin user already exists")
		return
	}

	admin := &domain.User{
		Username:    cfg.AdminUsername,
		Role:        "admin",
		DisplayName: cfg.AdminDisplayName,
	}

	// Use config password instead of hardcoded
	if err := userSvc.Create(context.Background(), admin, cfg.AdminPassword); err != nil {
		log.Fatalf("Failed to create admin: %v", err)
	}

	fmt.Println("✅ Admin user created successfully!")
	fmt.Printf("   Username: %s\n", cfg.AdminUsername)
	fmt.Printf("   Password: %s\n", cfg.AdminPassword)

	time.Sleep(500 * time.Millisecond)
}
