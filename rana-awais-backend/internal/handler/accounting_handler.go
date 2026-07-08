package handler

import (
	"net/http"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
)

type AccountingHandler struct {
	svc *service.AccountingService
}

func NewAccountingHandler(svc *service.AccountingService) *AccountingHandler {
	return &AccountingHandler{svc: svc}
}

func (h *AccountingHandler) TodaySummary(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	end := start.Add(24 * time.Hour)
	revenue, profit, err := h.svc.GetRevenueAndProfit(r.Context(), start, end)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to get today", "آج کا ڈیٹا نہیں آیا")
		return
	}

	db := config.DB
	var pendingTotal float64
	err = db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(COALESCE(d.amount, 0) + COALESCE(d.fine, 0) - COALESCE(d.partial_paid, 0)), 0)
		FROM installment_details d
		JOIN installment_plans p ON d.plan_id = p.id
		WHERE d.paid = 0 AND p.status = 'active' AND d.due_date >= ? AND d.due_date < ?
	`, start, end).Scan(&pendingTotal)
	if err != nil {
		pendingTotal = 0
	}

	var customerCount int
	db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM customers").Scan(&customerCount)

	var collectionCount int
	db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM payments WHERE transaction_date >= ? AND transaction_date < ?", start, end).Scan(&collectionCount)

	var activePlans int
	db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM installment_plans WHERE status IN ('active','overdue')").Scan(&activePlans)

	var totalOutstanding float64
	db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(COALESCE(d.amount,0)+COALESCE(d.fine,0)-COALESCE(d.partial_paid,0)), 0)
		FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id
		WHERE d.paid = 0 AND p.status IN ('active','overdue')
	`).Scan(&totalOutstanding)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"revenue":         revenue,
		"profit":          profit,
		"pending_total":   pendingTotal,
		"customers":       customerCount,
		"date":            now.Format("2006-01-02"),
		"collection_count": collectionCount,
		"active_plans":    activePlans,
		"total_outstanding": totalOutstanding,
	})
}

func (h *AccountingHandler) MonthSummary(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	end := start.AddDate(0, 1, 0)
	revenue, profit, err := h.svc.GetRevenueAndProfit(r.Context(), start, end)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to get month", "مہینے کا ڈیٹا نہیں آیا")
		return
	}

	db := config.DB
	var pendingTotal float64
	db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(COALESCE(d.amount, 0) + COALESCE(d.fine, 0) - COALESCE(d.partial_paid, 0)), 0)
		FROM installment_details d
		JOIN installment_plans p ON d.plan_id = p.id
		WHERE d.paid = 0 AND p.status = 'active' AND d.due_date >= ? AND d.due_date < ?
	`, start, end).Scan(&pendingTotal)

	var customerCount int
	db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM customers").Scan(&customerCount)

	var collectionCount int
	db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM payments WHERE transaction_date >= ? AND transaction_date < ?", start, end).Scan(&collectionCount)

	var activePlans int
	db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM installment_plans WHERE status IN ('active','overdue')").Scan(&activePlans)

	var totalOutstanding float64
	db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(COALESCE(d.amount,0)+COALESCE(d.fine,0)-COALESCE(d.partial_paid,0)), 0)
		FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id
		WHERE d.paid = 0 AND p.status IN ('active','overdue')
	`).Scan(&totalOutstanding)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"revenue":          revenue,
		"profit":           profit,
		"pending_total":    pendingTotal,
		"customers":        customerCount,
		"month":            now.Format("2006-01"),
		"collection_count": collectionCount,
		"active_plans":     activePlans,
		"total_outstanding": totalOutstanding,
	})
}

func (h *AccountingHandler) ProfitLossCashFlow(w http.ResponseWriter, r *http.Request) {
	start, end, err := parseDateRange(r)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid date range", "غلط تاریخ کی حد")
		return
	}
	revenue, profit, err := h.svc.GetRevenueAndProfit(r.Context(), start, end)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to get profit/loss", "منافع/نقصان نہیں آیا")
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"revenue": revenue,
		"profit":  profit,
		"start":   start.Format("2006-01-02"),
		"end":     end.Format("2006-01-02"),
	})
}

func (h *AccountingHandler) ProfitLossAccrual(w http.ResponseWriter, r *http.Request) {
	start, end, err := parseDateRange(r)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid date range", "غلط تاریخ کی حد")
		return
	}
	db := config.DB
	rows, err := db.QueryContext(r.Context(), `
		SELECT type, amount FROM accounting_entries 
		WHERE basis = 'accrual' AND date >= ? AND date <= ?
	`, start, end)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to get accrual report", "اکروئل رپورٹ نہیں آئی")
		return
	}
	defer rows.Close()
	var income, expense float64
	for rows.Next() {
		var typ string
		var amt float64
		rows.Scan(&typ, &amt)
		if typ == "income" {
			income += amt
		} else {
			expense += amt
		}
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"income":  income,
		"expense": expense,
		"profit":  income - expense,
	})
}