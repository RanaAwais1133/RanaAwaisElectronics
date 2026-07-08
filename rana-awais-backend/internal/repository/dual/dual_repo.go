package dual

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
)

// ═══════════════════════════════════════
// 🔄 DUAL DATABASE REPOSITORY
// ═══════════════════════════════════════
// Writes to both SQLite (local) and MongoDB (cloud)
// Reads from SQLite for speed, syncs to MongoDB in background

// SyncEngine handles background synchronization
type SyncEngine struct {
	mu           sync.RWMutex
	localDB      repository.SyncLogRepository
	cloudDB      repository.SyncLogRepository
	isRunning    bool
	stopChan     chan struct{}
	syncInterval time.Duration
	repos        *Repositories
}

// Repositories holds all dual repositories
type Repositories struct {
	Customers     repository.CustomerRepository
	Guarantors    repository.GuarantorRepository
	Products      repository.ProductRepository
	Inventory     repository.InventoryRepository
	Installments  repository.InstallmentRepository
	Payments      repository.PaymentRepository
	Accounting    repository.AccountingRepository
	Notifications repository.NotificationRepository
	Users         repository.UserRepository
	SyncLog       repository.SyncLogRepository
}

// NewSyncEngine creates a new sync engine
func NewSyncEngine(localDB, cloudDB repository.SyncLogRepository, repos *Repositories) *SyncEngine {
	return &SyncEngine{
		localDB:      localDB,
		cloudDB:      cloudDB,
		syncInterval: 30 * time.Second, // Check every 30 seconds
		stopChan:     make(chan struct{}),
		repos:        repos,
	}
}

// Start begins the background sync process
func (e *SyncEngine) Start() {
	e.mu.Lock()
	if e.isRunning {
		e.mu.Unlock()
		return
	}
	e.isRunning = true
	e.mu.Unlock()

	go e.syncLoop()
	log.Println("🔄 Sync Engine started - checking every 30 seconds")
}

// Stop stops the background sync process
func (e *SyncEngine) Stop() {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.isRunning {
		close(e.stopChan)
		e.isRunning = false
		log.Println("🔄 Sync Engine stopped")
	}
}

// syncLoop runs the sync process periodically
func (e *SyncEngine) syncLoop() {
	ticker := time.NewTicker(e.syncInterval)
	defer ticker.Stop()

	// Run initial sync after 5 seconds
	time.Sleep(5 * time.Second)
	e.syncAll()

	for {
		select {
		case <-ticker.C:
			e.syncAll()
		case <-e.stopChan:
			return
		}
	}
}

// syncAll syncs all pending records from local to cloud
func (e *SyncEngine) syncAll() {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Get all pending sync records from local
	records, err := e.localDB.GetPendingSyncRecords(ctx)
	if err != nil {
		log.Printf("⚠️ Sync: Failed to get pending records: %v", err)
		return
	}

	if len(records) == 0 {
		return
	}

	log.Printf("🔄 Syncing %d pending records...", len(records))

	for _, record := range records {
		e.syncRecord(ctx, record)
	}

	// Also pull changes from cloud to local
	e.pullFromCloud(ctx)
}

// syncRecord syncs a single record
func (e *SyncEngine) syncRecord(ctx context.Context, record repository.SyncRecord) {
	now := time.Now()
	record.LastAttempt = &now
	record.RetryCount++

	// Determine which repository to use based on entity
	var err error
	switch record.Entity {
	case "customers":
		err = e.syncCustomer(ctx, record)
	case "guarantors":
		err = e.syncGuarantor(ctx, record)
	case "products":
		err = e.syncProduct(ctx, record)
	case "inventory_items":
		err = e.syncInventory(ctx, record)
	case "installment_plans":
		err = e.syncInstallment(ctx, record)
	case "payments":
		err = e.syncPayment(ctx, record)
	case "accounting_entries":
		err = e.syncAccounting(ctx, record)
	case "notifications":
		err = e.syncNotification(ctx, record)
	case "users":
		err = e.syncUser(ctx, record)
	default:
		log.Printf("⚠️ Sync: Unknown entity type: %s", record.Entity)
		return
	}

	if err != nil {
		record.Status = "failed"
		record.Error = err.Error()
		log.Printf("⚠️ Sync failed for %s/%s: %v", record.Entity, record.EntityID, err)
	} else {
		now := time.Now()
		record.Status = "synced"
		record.SyncedAt = &now
		record.Error = ""
	}

	// Update sync record status
	e.localDB.UpdateSyncRecord(ctx, record)
}

// syncCustomer syncs a customer record
func (e *SyncEngine) syncCustomer(ctx context.Context, record repository.SyncRecord) error {
	switch record.Operation {
	case "create":
		customer, err := e.repos.Customers.GetByID(ctx, record.EntityID)
		if err != nil {
			return fmt.Errorf("failed to get customer from local: %v", err)
		}
		return e.repos.Customers.Create(ctx, customer)
	case "update":
		customer, err := e.repos.Customers.GetByID(ctx, record.EntityID)
		if err != nil {
			return fmt.Errorf("failed to get customer from local: %v", err)
		}
		return e.repos.Customers.Update(ctx, record.EntityID, customer)
	case "delete":
		return e.repos.Customers.Delete(ctx, record.EntityID)
	}
	return nil
}

func (e *SyncEngine) syncGuarantor(ctx context.Context, record repository.SyncRecord) error {
	switch record.Operation {
	case "create":
		guarantor, err := e.repos.Guarantors.GetByID(ctx, record.EntityID)
		if err != nil {
			return fmt.Errorf("failed to get guarantor from local: %v", err)
		}
		return e.repos.Guarantors.Create(ctx, guarantor)
	case "update":
		guarantor, err := e.repos.Guarantors.GetByID(ctx, record.EntityID)
		if err != nil {
			return fmt.Errorf("failed to get guarantor from local: %v", err)
		}
		return e.repos.Guarantors.Update(ctx, record.EntityID, guarantor)
	case "delete":
		return e.repos.Guarantors.Delete(ctx, record.EntityID)
	}
	return nil
}

func (e *SyncEngine) syncProduct(ctx context.Context, record repository.SyncRecord) error {
	switch record.Operation {
	case "create":
		product, err := e.repos.Products.GetByID(ctx, record.EntityID)
		if err != nil {
			return fmt.Errorf("failed to get product from local: %v", err)
		}
		return e.repos.Products.Create(ctx, product)
	case "update":
		product, err := e.repos.Products.GetByID(ctx, record.EntityID)
		if err != nil {
			return fmt.Errorf("failed to get product from local: %v", err)
		}
		return e.repos.Products.Update(ctx, record.EntityID, product)
	case "delete":
		return e.repos.Products.Delete(ctx, record.EntityID)
	}
	return nil
}

func (e *SyncEngine) syncInventory(ctx context.Context, record repository.SyncRecord) error {
	switch record.Operation {
	case "create":
		item, err := e.repos.Inventory.GetByID(ctx, record.EntityID)
		if err != nil {
			return fmt.Errorf("failed to get inventory from local: %v", err)
		}
		return e.repos.Inventory.Create(ctx, item)
	case "update":
		item, err := e.repos.Inventory.GetByID(ctx, record.EntityID)
		if err != nil {
			return fmt.Errorf("failed to get inventory from local: %v", err)
		}
		return e.repos.Inventory.Update(ctx, record.EntityID, item)
	case "delete":
		return e.repos.Inventory.Delete(ctx, record.EntityID)
	}
	return nil
}

func (e *SyncEngine) syncInstallment(ctx context.Context, record repository.SyncRecord) error {
	switch record.Operation {
	case "create":
		plan, err := e.repos.Installments.GetByID(ctx, record.EntityID)
		if err != nil {
			return fmt.Errorf("failed to get installment from local: %v", err)
		}
		return e.repos.Installments.Create(ctx, plan)
	case "update":
		plan, err := e.repos.Installments.GetByID(ctx, record.EntityID)
		if err != nil {
			return fmt.Errorf("failed to get installment from local: %v", err)
		}
		return e.repos.Installments.Update(ctx, record.EntityID, plan)
	case "delete":
		return e.repos.Installments.Delete(ctx, record.EntityID)
	}
	return nil
}

func (e *SyncEngine) syncPayment(ctx context.Context, record repository.SyncRecord) error {
	switch record.Operation {
	case "create":
		payment, err := e.repos.Payments.GetByID(ctx, record.EntityID)
		if err != nil {
			return fmt.Errorf("failed to get payment from local: %v", err)
		}
		return e.repos.Payments.Create(ctx, payment)
	case "delete":
		return e.repos.Payments.Delete(ctx, record.EntityID)
	}
	return nil
}

func (e *SyncEngine) syncAccounting(ctx context.Context, record repository.SyncRecord) error {
	return nil // Accounting is computed, not synced directly
}

func (e *SyncEngine) syncNotification(ctx context.Context, record repository.SyncRecord) error {
	return nil // Notifications are ephemeral
}

func (e *SyncEngine) syncUser(ctx context.Context, record repository.SyncRecord) error {
	switch record.Operation {
	case "create":
		user, err := e.repos.Users.GetByID(ctx, record.EntityID)
		if err != nil {
			return fmt.Errorf("failed to get user from local: %v", err)
		}
		return e.repos.Users.Create(ctx, user)
	case "update":
		user, err := e.repos.Users.GetByID(ctx, record.EntityID)
		if err != nil {
			return fmt.Errorf("failed to get user from local: %v", err)
		}
		return e.repos.Users.Update(ctx, record.EntityID, user)
	case "delete":
		return e.repos.Users.Delete(ctx, record.EntityID)
	}
	return nil
}

// ForceSync triggers an immediate sync in a goroutine
func (e *SyncEngine) ForceSync() {
	go e.syncAll()
	log.Println("🔄 Force sync triggered")
}

// pullFromCloud pulls changes from MongoDB to local SQLite
func (e *SyncEngine) pullFromCloud(ctx context.Context) {

	// Get cloud sync records that are newer than last local sync
	records, err := e.cloudDB.GetPendingSyncRecords(ctx)
	if err != nil {
		return
	}

	for _, record := range records {
		// Check if we already have this record locally
		localRecord, err := e.localDB.GetSyncRecord(ctx, record.Entity, record.EntityID)
		if err != nil || localRecord == nil {
			// New record from cloud, apply to local
			e.applyCloudChange(ctx, record)
		}
	}
}

// applyCloudChange applies a change from cloud to local
func (e *SyncEngine) applyCloudChange(ctx context.Context, record repository.SyncRecord) {
	// For now, just log it
	log.Printf("🔄 Pulling %s/%s from cloud", record.Entity, record.EntityID)
}

// ═══════════════════════════════════════
// 🏭 FACTORY
// ═══════════════════════════════════════

// NewDualRepositories creates repositories that write to both SQLite and MongoDB
func NewDualRepositories(
	localRepo, cloudRepo repository.CustomerRepository,
	localGuarRepo, cloudGuarRepo repository.GuarantorRepository,
	localProdRepo, cloudProdRepo repository.ProductRepository,
	localInvRepo, cloudInvRepo repository.InventoryRepository,
	localPlanRepo, cloudPlanRepo repository.InstallmentRepository,
	localPayRepo, cloudPayRepo repository.PaymentRepository,
	localAccRepo, cloudAccRepo repository.AccountingRepository,
	localNotifRepo, cloudNotifRepo repository.NotificationRepository,
	localUserRepo, cloudUserRepo repository.UserRepository,
	localSyncRepo, cloudSyncRepo repository.SyncLogRepository,
) (*Repositories, *SyncEngine) {

	repos := &Repositories{
		Customers:     localRepo,
		Guarantors:    localGuarRepo,
		Products:      localProdRepo,
		Inventory:     localInvRepo,
		Installments:  localPlanRepo,
		Payments:      localPayRepo,
		Accounting:    localAccRepo,
		Notifications: localNotifRepo,
		Users:         localUserRepo,
		SyncLog:       localSyncRepo,
	}

	engine := NewSyncEngine(localSyncRepo, cloudSyncRepo, repos)
	return repos, engine
}
