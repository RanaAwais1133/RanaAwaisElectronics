package sqlite

import (
	"context"
	"database/sql"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/google/uuid"
)

type AccountingRepository struct {
	db *sql.DB
}

func NewAccountingRepository(db *sql.DB) *AccountingRepository {
	return &AccountingRepository{db: db}
}

func (r *AccountingRepository) Create(ctx context.Context, e *domain.AccountingEntry) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	e.CreatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO accounting_entries (id, type, basis, amount, description, related_plan_id, related_payment_id, fine_amount, date, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		e.ID, e.Type, e.Basis, e.Amount, e.Description, e.RelatedPlanID, e.RelatedPaymentID, e.FineAmount, e.Date, e.CreatedAt)
	return err
}

func (r *AccountingRepository) GetCashFlowReport(ctx context.Context, start, end time.Time) ([]domain.AccountingEntry, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, type, basis, amount, description, related_plan_id, related_payment_id, fine_amount, date, created_at
		FROM accounting_entries WHERE date >= ? AND date < ? AND basis = 'cash' ORDER BY date`, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanEntries(rows)
}

func (r *AccountingRepository) GetAccrualReport(ctx context.Context, start, end time.Time) ([]domain.AccountingEntry, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, type, basis, amount, description, related_plan_id, related_payment_id, fine_amount, date, created_at
		FROM accounting_entries WHERE date >= ? AND date < ? AND basis = 'accrual' ORDER BY date`, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanEntries(rows)
}

func (r *AccountingRepository) GetSoldItems(ctx context.Context, start, end time.Time) ([]domain.InventoryItem, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, product_id, serial_number, color, model, engine_no, chassis_no, imei, company,
			status, purchase_date, purchase_price, selling_price, sold_date, created_at, updated_at
		FROM inventory_items WHERE sold_date >= ? AND sold_date < ? AND status = 'sold'`, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.InventoryItem
	for rows.Next() {
		var item domain.InventoryItem
		var color, model, engineNo, chassisNo, imei, company, soldDate sql.NullString
		var purchaseDate sql.NullTime
		err := rows.Scan(&item.ID, &item.ProductID, &item.SerialNumber, &color, &model, &engineNo, &chassisNo, &imei, &company,
			&item.Status, &purchaseDate, &item.PurchasePrice, &item.SellingPrice, &soldDate, &item.CreatedAt, &item.UpdatedAt)
		if err != nil {
			return nil, err
		}
		item.Color = color.String
		item.Model = model.String
		item.EngineNo = engineNo.String
		item.ChassisNo = chassisNo.String
		item.IMEI = imei.String
		item.Company = company.String
		if purchaseDate.Valid {
			item.PurchaseDate = purchaseDate.Time
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *AccountingRepository) GetRevenueAndProfit(ctx context.Context, start, end time.Time) (revenue float64, profit float64, err error) {
	// Revenue from payments (installments + advance payments)
	err = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(amount), 0) FROM payments WHERE transaction_date >= ? AND transaction_date < ?`, start, end).Scan(&revenue)
	if err != nil {
		return 0, 0, err
	}

	// Also include down payments from installment_plans created in this period
	var downPaymentRevenue float64
	r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(down_payment), 0) FROM installment_plans 
		WHERE created_at >= ? AND created_at < ?`, start, end).Scan(&downPaymentRevenue)
	revenue += downPaymentRevenue

	// ============================================================
	// PROFIT CALCULATION - PROFIT PERCENTAGE BASED
	// ============================================================
	// Har product ki apni profit margin hoti hai:
	//   Profit% = (SellingPrice - PurchasePrice) / PurchasePrice * 100
	//   Example: 80,000 ki le kr 100,000 ki bechi => Profit% = 25%
	//
	// Jab bhi payment aati hai (advance/installment), uska profit
	// percentage ke hisaab se calculate hota hai:
	//   Profit = Payment × (Profit% / (1 + Profit%))
	//   Example: 20,000 advance aaya => Profit = 20,000 × (25/125) = 4,000
	//
	// Simple formula: Profit = Payment × (1 - PurchasePrice/SellingPrice)
	// ============================================================

	// Get profit from payments using profit percentage per plan
	var profitFromPayments float64
	r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(pay.amount * (1.0 - COALESCE(prod.purchase_price, 0) / NULLIF(p.total_amount, 0))), 0)
		FROM payments pay
		JOIN installment_plans p ON pay.installment_plan_id = p.id
		LEFT JOIN products prod ON p.product_id = prod.id
		WHERE pay.transaction_date >= ? AND pay.transaction_date < ?
	`, start, end).Scan(&profitFromPayments)

	// Get profit from down payments using profit percentage per plan
	var profitFromDownPayments float64
	r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(ip.down_payment * (1.0 - COALESCE(prod.purchase_price, 0) / NULLIF(ip.total_amount, 0))), 0)
		FROM installment_plans ip
		LEFT JOIN products prod ON ip.product_id = prod.id
		WHERE ip.created_at >= ? AND ip.created_at < ? AND ip.down_payment > 0
	`, start, end).Scan(&profitFromDownPayments)

	profit = profitFromPayments + profitFromDownPayments

	// Subtract expenses (pure expenses like rent, electricity, etc.)
	var expenseFromEntries float64
	r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(amount), 0) FROM accounting_entries 
		WHERE type = 'expense' AND date >= ? AND date < ?`, start, end).Scan(&expenseFromEntries)
	profit -= expenseFromEntries

	return revenue, profit, nil
}


func (r *AccountingRepository) DeleteByPlanID(ctx context.Context, planID string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM accounting_entries WHERE related_plan_id = ?", planID)
	return err
}

// DeleteByPlanIDAndDate deletes accounting entries for a specific plan on a specific date
// Used for undoing a single payment without destroying all accounting history
func (r *AccountingRepository) DeleteByPlanIDAndDate(ctx context.Context, planID string, date time.Time) error {
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)
	_, err := r.db.ExecContext(ctx, "DELETE FROM accounting_entries WHERE related_plan_id = ? AND date >= ? AND date < ?", planID, startOfDay, endOfDay)
	return err
}

func (r *AccountingRepository) scanEntries(rows *sql.Rows) ([]domain.AccountingEntry, error) {
	var entries []domain.AccountingEntry
	for rows.Next() {
		var e domain.AccountingEntry
		var relatedPlanID, relatedPaymentID sql.NullString
		err := rows.Scan(&e.ID, &e.Type, &e.Basis, &e.Amount, &e.Description, &relatedPlanID, &relatedPaymentID, &e.FineAmount, &e.Date, &e.CreatedAt)
		if err != nil {
			return nil, err
		}
		e.RelatedPlanID = relatedPlanID.String
		e.RelatedPaymentID = relatedPaymentID.String
		entries = append(entries, e)
	}
	return entries, nil
}
