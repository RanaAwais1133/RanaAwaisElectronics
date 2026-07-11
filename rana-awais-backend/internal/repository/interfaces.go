package repository

import (
	"context"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
)

type CustomerRepository interface {
	Create(ctx context.Context, c *domain.Customer) error
	GetByID(ctx context.Context, id string) (*domain.Customer, error)
	GetByPhone(ctx context.Context, phone string) (*domain.Customer, error)
	Update(ctx context.Context, id string, c *domain.Customer) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, skip, limit int64) ([]domain.Customer, error)
	Search(ctx context.Context, query string, skip, limit int64) ([]domain.Customer, error)
	Count(ctx context.Context) (int64, error)
}

type GuarantorRepository interface {
	Create(ctx context.Context, g *domain.Guarantor) error
	GetByID(ctx context.Context, id string) (*domain.Guarantor, error)
	Update(ctx context.Context, id string, g *domain.Guarantor) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, skip, limit int64) ([]domain.Guarantor, error)
	ListByCustomer(ctx context.Context, customerID string) ([]domain.Guarantor, error)
	ListByCustomerIDs(ctx context.Context, customerIDs []string) ([]domain.Guarantor, error)
	Count(ctx context.Context) (int64, error)
}

type ProductRepository interface {
	Create(ctx context.Context, p *domain.Product) error
	GetByID(ctx context.Context, id string) (*domain.Product, error)
	GetByIDWithStock(ctx context.Context, id string) (*domain.Product, error)
	Update(ctx context.Context, id string, p *domain.Product) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, skip, limit int64) ([]domain.Product, error)
	ListByCategory(ctx context.Context, category string) ([]domain.Product, error)
	Count(ctx context.Context) (int64, error)
	Search(ctx context.Context, query string, skip, limit int64) ([]domain.Product, error)
	BulkDelete(ctx context.Context, ids []string) error
	GetLowStock(ctx context.Context, threshold int) ([]domain.Product, error)
}


type InventoryRepository interface {
	Create(ctx context.Context, item *domain.InventoryItem) error
	GetByID(ctx context.Context, id string) (*domain.InventoryItem, error)
	Update(ctx context.Context, id string, item *domain.InventoryItem) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, skip, limit int64) ([]domain.InventoryItem, error)
	GetBySerial(ctx context.Context, serial string) (*domain.InventoryItem, error)
	GetAgeingReport(ctx context.Context, olderThanDays int) ([]domain.InventoryItem, error)
	ListByProduct(ctx context.Context, productID string) ([]domain.InventoryItem, error)
	Count(ctx context.Context) (int64, error)
}

type InstallmentRepository interface {
	Create(ctx context.Context, plan *domain.InstallmentPlan) error
	GetByID(ctx context.Context, id string) (*domain.InstallmentPlan, error)
	Update(ctx context.Context, id string, plan *domain.InstallmentPlan) error
	Delete(ctx context.Context, id string) error
	ListByCustomer(ctx context.Context, customerID string) ([]domain.InstallmentPlan, error)
	ListAll(ctx context.Context, skip, limit int64) ([]domain.InstallmentPlan, error)
	GetActivePlans(ctx context.Context) ([]domain.InstallmentPlan, error)
	GetPlansWithDueDate(ctx context.Context, dueDate time.Time) ([]domain.InstallmentPlan, error)
	AddPaymentDetail(ctx context.Context, planID string, installmentNo int, payment domain.InstallmentDetail) error
	UpdateInstallmentStatus(ctx context.Context, planID string, installmentNo int, paid bool, paidDate *time.Time) error
	GetPlansWithDueDateRange(ctx context.Context, start, end time.Time) ([]domain.InstallmentPlan, error)
	GetInstallmentsByDateRange(ctx context.Context, start, end time.Time) ([]domain.InstallmentDetail, error)
}

type PaymentRepository interface {
	Create(ctx context.Context, p *domain.Payment) error
	GetByID(ctx context.Context, id string) (*domain.Payment, error)
	ListByPlan(ctx context.Context, planID string) ([]domain.Payment, error)
	ListAll(ctx context.Context, skip, limit int64) ([]domain.Payment, error)
	GetPaymentsByDateRange(ctx context.Context, start, end time.Time) ([]domain.Payment, error)
	GetTodayPayments(ctx context.Context) ([]domain.Payment, error)
	GetMonthlyPayments(ctx context.Context, year int, month time.Month) ([]domain.Payment, error)
	Delete(ctx context.Context, id string) error
	DeleteByInstallment(ctx context.Context, planID string, installmentNo int) (int64, error)
}

type AccountingRepository interface {
	Create(ctx context.Context, e *domain.AccountingEntry) error
	GetCashFlowReport(ctx context.Context, start, end time.Time) ([]domain.AccountingEntry, error)
	GetAccrualReport(ctx context.Context, start, end time.Time) ([]domain.AccountingEntry, error)
	GetSoldItems(ctx context.Context, start, end time.Time) ([]domain.InventoryItem, error)
	GetRevenueAndProfit(ctx context.Context, start, end time.Time) (revenue float64, profit float64, err error)
	DeleteByPlanID(ctx context.Context, planID string) error
	DeleteByPlanIDAndDate(ctx context.Context, planID string, date time.Time) error
}

type NotificationRepository interface {
	Create(ctx context.Context, n *domain.Notification) error
	GetByCustomer(ctx context.Context, customerID string) ([]domain.Notification, error)
	UpdateStatus(ctx context.Context, id string, status string) error
}

type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	GetByUsername(ctx context.Context, username string) (*domain.User, error)
	GetByID(ctx context.Context, id string) (*domain.User, error)
	List(ctx context.Context, skip, limit int64) ([]domain.User, error)
	Update(ctx context.Context, id string, user *domain.User) error
	Delete(ctx context.Context, id string) error
	Count(ctx context.Context) (int64, error)
}

// ExpenseRepository handles business expenses
type ExpenseRepository interface {
	Create(ctx context.Context, e *domain.Expense) error
	GetByID(ctx context.Context, id string) (*domain.Expense, error)
	Update(ctx context.Context, id string, e *domain.Expense) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, skip, limit int64) ([]domain.Expense, error)
	Count(ctx context.Context) (int64, error)
}

// SettingsRepository handles settings, license, and audit logs
type SettingsRepository interface {
	GetSetting(ctx context.Context, key string) (string, error)
	SetSetting(ctx context.Context, key, value string) error
	GetAllSettings(ctx context.Context) (map[string]string, error)
	GetLicenseStatus(ctx context.Context, licenseKey string) (bool, error)
	CreateLicense(ctx context.Context, license *domain.License) error
	CountLicenses(ctx context.Context, filter bson.M) (int64, error)
	InsertAuditLog(ctx context.Context, log domain.AuditLog) error
	GetAuditLogs(ctx context.Context, skip, limit int64) ([]domain.AuditLog, int64, error)
}

// SyncLogRepository handles sync log records for offline-first architecture
type SyncLogRepository interface {
	CreateSyncRecord(ctx context.Context, record SyncRecord) error
	UpdateSyncRecord(ctx context.Context, record SyncRecord) error
	GetPendingSyncRecords(ctx context.Context) ([]SyncRecord, error)
	GetSyncRecord(ctx context.Context, entity, entityID string) (*SyncRecord, error)
	GetSyncStatus(ctx context.Context) (map[string]interface{}, error)
}

// SyncRecord represents a sync log entry for offline-first sync
type SyncRecord struct {
	ID          string                 `json:"id"`
	Entity      string                 `json:"entity"`
	EntityID    string                 `json:"entity_id"`
	Operation   string                 `json:"operation"`
	Data        map[string]interface{} `json:"data,omitempty"`
	Status      string                 `json:"status"`
	CreatedAt   time.Time              `json:"created_at"`
	SyncedAt    *time.Time             `json:"synced_at,omitempty"`
	Error       string                 `json:"error,omitempty"`
	RetryCount  int                    `json:"retry_count"`
	LastAttempt *time.Time             `json:"last_attempt,omitempty"`
}
