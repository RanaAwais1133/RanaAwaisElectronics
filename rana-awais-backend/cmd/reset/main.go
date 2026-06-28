package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository/mongo"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
)

func main() {
	cfg := config.Load()
	config.ConnectDB(cfg)

	// ═══════════════════════════════════════
	// 🔐 SAFETY CONFIRMATION
	// ═══════════════════════════════════════
	fmt.Println(strings.Repeat("═", 55))
	fmt.Println("⚠️  DATABASE RESET — ALL DATA WILL BE DELETED!")
	fmt.Println(strings.Repeat("═", 55))
	fmt.Println()
	fmt.Println("This will permanently delete ALL data from the following:")
	fmt.Println("  • Customers      • Guarantors     • Products")
	fmt.Println("  • Inventory      • Installments   • Payments")
	fmt.Println("  • Audit Logs     • Notifications  • Accounting")
	fmt.Println()
	fmt.Println("🔒 Users collection will NOT be touched.")
	fmt.Println()
	fmt.Print("👉 Type 'YES' to confirm and continue: ")

	reader := bufio.NewReader(os.Stdin)
	confirm, _ := reader.ReadString('\n')
	confirm = strings.TrimSpace(confirm)

	if confirm != "YES" {
		fmt.Println("\n❌ Operation aborted. No changes were made.")
		time.Sleep(500 * time.Millisecond)
		return
	}

	fmt.Println("\n⏳ Starting database reset...")

	// ═══════════════════════════════════════
	// 🗑️ DROP ALL DATA COLLECTIONS (PARALLEL)
	// ═══════════════════════════════════════
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

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

	fmt.Println("\n🗑️  Dropping data collections...")
	fmt.Println(strings.Repeat("─", 40))

	var wg sync.WaitGroup
	var mu sync.Mutex
	successCount := 0
	failCount := 0

	for _, coll := range collections {
		wg.Add(1)
		go func(collectionName string) {
			defer wg.Done()

			if err := config.DB.Collection(collectionName).Drop(ctx); err != nil {
				mu.Lock()
				failCount++
				mu.Unlock()
				log.Printf("   ⚠️  Failed to drop '%s': %v", collectionName, err)
			} else {
				mu.Lock()
				successCount++
				mu.Unlock()
				fmt.Printf("   ✅ Dropped: %s\n", collectionName)
			}
		}(coll)
	}

	wg.Wait()

	fmt.Println(strings.Repeat("─", 40))
	fmt.Printf("   Results: %d dropped, %d failed\n", successCount, failCount)

	// ═══════════════════════════════════════
	// 👤 ENSURE ADMIN USER EXISTS
	// ═══════════════════════════════════════
	fmt.Println("\n👤 Checking admin user...")
	fmt.Println(strings.Repeat("─", 40))

	userRepo := mongo.NewUserRepository()
	userSvc := service.NewUserService(userRepo)

	existingAdmin, err := userRepo.GetByUsername(ctx, cfg.AdminUsername)
	if err != nil {
		log.Printf("   ⚠️  Could not check existing admin: %v", err)
	}

	if existingAdmin != nil {
		// Update existing admin's password and display name
		fmt.Printf("   ℹ️  Admin user '%s' already exists\n", cfg.AdminUsername)
		fmt.Println("   🔄 Updating admin credentials...")

		updateData := &domain.User{
			DisplayName: cfg.AdminDisplayName,
		}
		if err := userRepo.Update(ctx, existingAdmin.ID, updateData); err != nil {
			log.Printf("   ⚠️  Failed to update admin display name: %v", err)
		}

		if err := userSvc.UpdatePassword(ctx, existingAdmin.ID, cfg.AdminPassword); err != nil {
			log.Printf("   ⚠️  Failed to update admin password: %v", err)
		} else {
			fmt.Println("   ✅ Admin password updated successfully")
		}
	} else {
		// Create new admin user
		fmt.Printf("   ℹ️  Admin user '%s' not found, creating...\n", cfg.AdminUsername)

		admin := &domain.User{
			Username:    cfg.AdminUsername,
			Role:        "admin",
			DisplayName: cfg.AdminDisplayName,
		}

		if err := userSvc.Create(ctx, admin, cfg.AdminPassword); err != nil {
			log.Fatalf("   ❌ Failed to create admin: %v", err)
		}
		fmt.Println("   ✅ Admin user created successfully")
	}

	// ═══════════════════════════════════════
	// ✅ FINAL SUMMARY
	// ═══════════════════════════════════════
	fmt.Println()
	fmt.Println(strings.Repeat("═", 55))
	fmt.Println("✅ DATABASE RESET COMPLETE!")
	fmt.Println(strings.Repeat("═", 55))
	fmt.Println()
	fmt.Printf("   📋 Collections cleared : %d/%d\n", successCount, len(collections))
	fmt.Printf("   👤 Admin username      : %s\n", cfg.AdminUsername)
	fmt.Printf("   🔑 Admin password      : %s\n", cfg.AdminPassword)
	fmt.Println()
	fmt.Println("   ℹ️  You can now restart the server.")
	fmt.Println("   ℹ️  Indexes will be auto-created on server startup.")
	fmt.Println()
	fmt.Println(strings.Repeat("═", 55))

	time.Sleep(500 * time.Millisecond)
}
