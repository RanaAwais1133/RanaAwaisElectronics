package repository

import (
	"context"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CustomerRepository interface {
	Create(ctx context.Context, c *domain.Customer) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*domain.Customer, error)
	GetByPhone(ctx context.Context, phone string) (*domain.Customer, error)
	Update(ctx context.Context, id primitive.ObjectID, c *domain.Customer) error
	Delete(ctx context.Context, id primitive.ObjectID) error
	List(ctx context.Context, skip, limit int64) ([]domain.Customer, error)
	Search(ctx context.Context, query string, skip, limit int64) ([]domain.Customer, error)
	Count(ctx context.Context) (int64, error)
}

type GuarantorRepository interface {
	Create(ctx context.Context, g *domain.Guarantor) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*domain.Guarantor, error)
	Update(ctx context.Context, id primitive.ObjectID, g *domain.Guarantor) error
	Delete(ctx context.Context, id primitive.ObjectID) error
	List(ctx context.Context, skip, limit int64) ([]domain.Guarantor, error)
	ListByCustomer(ctx context.Context, customerID primitive.ObjectID) ([]domain.Guarantor, error)
	Count(ctx context.Context) (int64, error)
}

type ProductRepository interface {
	Create(ctx context.Context, p *domain.Product) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*domain.Product, error)
	GetByIDWithStock(ctx context.Context, id primitive.ObjectID) (*domain.Product, error)
	Update(ctx context.Context, id primitive.ObjectID, p *domain.Product) error
	Delete(ctx context.Context, id primitive.ObjectID) error
	List(ctx context.Context, skip, limit int64) ([]domain.Product, error)
	ListByCategory(ctx context.Context, category string) ([]domain.Product, error)
	Count(ctx context.Context) (int64, error)
}

type InventoryRepository interface {
	Create(ctx context.Context, item *domain.InventoryItem) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*domain.InventoryItem, error)
	Update(ctx context.Context, id primitive.ObjectID, item *domain.InventoryItem) error
	Delete(ctx context.Context, id primitive.ObjectID) error
	List(ctx context.Context, skip, limit int64) ([]domain.InventoryItem, error)
	GetBySerial(ctx context.Context, serial string) (*domain.InventoryItem, error)
	GetAgeingReport(ctx context.Context, olderThanDays int) ([]domain.InventoryItem, error)
	ListByProduct(ctx context.Context, productID primitive.ObjectID) ([]domain.InventoryItem, error)
	Count(ctx context.Context) (int64, error)
}

type InstallmentRepository interface {
	Create(ctx context.Context, plan *domain.InstallmentPlan) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*domain.InstallmentPlan, error)
	Update(ctx context.Context, id primitive.ObjectID, plan *domain.InstallmentPlan) error
	Delete(ctx context.Context, id primitive.ObjectID) error
	ListByCustomer(ctx context.Context, customerID primitive.ObjectID) ([]domain.InstallmentPlan, error)
	GetActivePlans(ctx context.Context) ([]domain.InstallmentPlan, error)
	GetPlansWithDueDate(ctx context.Context, dueDate time.Time) ([]domain.InstallmentPlan, error)
	AddPaymentDetail(ctx context.Context, planID primitive.ObjectID, installmentNo int, payment domain.InstallmentDetail) error
	UpdateInstallmentStatus(ctx context.Context, planID primitive.ObjectID, installmentNo int, paid bool, paidDate *time.Time) error
	// ✅ NEW: For dashboard reports
	GetPlansWithDueDateRange(ctx context.Context, start, end time.Time) ([]domain.InstallmentPlan, error)
	GetInstallmentsByDateRange(ctx context.Context, start, end time.Time) ([]domain.InstallmentDetail, error)
}

type PaymentRepository interface {
	Create(ctx context.Context, p *domain.Payment) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*domain.Payment, error)
	ListByPlan(ctx context.Context, planID primitive.ObjectID) ([]domain.Payment, error)
	// ✅ NEW: For reports
	GetPaymentsByDateRange(ctx context.Context, start, end time.Time) ([]domain.Payment, error)
	GetTodayPayments(ctx context.Context) ([]domain.Payment, error)
	GetMonthlyPayments(ctx context.Context, year int, month time.Month) ([]domain.Payment, error)
}

type AccountingRepository interface {
	Create(ctx context.Context, e *domain.AccountingEntry) error
	GetCashFlowReport(ctx context.Context, start, end time.Time) ([]domain.AccountingEntry, error)
	GetAccrualReport(ctx context.Context, start, end time.Time) ([]domain.AccountingEntry, error)
	GetSoldItems(ctx context.Context, start, end time.Time) ([]domain.InventoryItem, error)
	// ✅ NEW: For dashboard
	GetRevenueAndProfit(ctx context.Context, start, end time.Time) (revenue float64, profit float64, err error)
}

type NotificationRepository interface {
	Create(ctx context.Context, n *domain.Notification) error
	GetByCustomer(ctx context.Context, customerID primitive.ObjectID) ([]domain.Notification, error)
	UpdateStatus(ctx context.Context, id primitive.ObjectID, status string) error
}

type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	GetByUsername(ctx context.Context, username string) (*domain.User, error)
	GetByID(ctx context.Context, id primitive.ObjectID) (*domain.User, error)
	List(ctx context.Context, skip, limit int64) ([]domain.User, error)
	Update(ctx context.Context, id primitive.ObjectID, user *domain.User) error
	Delete(ctx context.Context, id primitive.ObjectID) error
	Count(ctx context.Context) (int64, error)
}
