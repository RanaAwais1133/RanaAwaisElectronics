package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
)

type AccountingHandler struct {
	svc *service.AccountingService
}

func NewAccountingHandler(svc *service.AccountingService) *AccountingHandler {
	return &AccountingHandler{svc: svc}
}

// TodaySummary returns revenue and profit for today.
func (h *AccountingHandler) TodaySummary(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	end := start.Add(24 * time.Hour)
	revenue, profit, err := h.svc.GetRevenueAndProfit(r.Context(), start, end)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to get today", "آج کا ڈیٹا نہیں آیا")
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"revenue": revenue,
		"profit":  profit,
	})
}

// MonthSummary returns revenue and profit for current month.
func (h *AccountingHandler) MonthSummary(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	end := start.AddDate(0, 1, 0)
	revenue, profit, err := h.svc.GetRevenueAndProfit(r.Context(), start, end)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to get month", "ماہانہ ڈیٹا نہیں آیا")
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"revenue": revenue,
		"profit":  profit,
	})
}

// ProfitLossCashFlow returns cash_flow profit for a custom date range.
func (h *AccountingHandler) ProfitLossCashFlow(w http.ResponseWriter, r *http.Request) {
	start, end, err := parseDateRange(r)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid date range", "غلط تاریخ کی حد")
		return
	}
	profit, err := h.svc.GetProfitLossCashFlow(r.Context(), start, end)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Report failed", "رپورٹ نہیں بن سکی")
		return
	}
	respondJSON(w, http.StatusOK, map[string]float64{"profit": profit})
}

// ProfitLossAccrual returns accrual profit for a custom date range.
func (h *AccountingHandler) ProfitLossAccrual(w http.ResponseWriter, r *http.Request) {
	start, end, err := parseDateRange(r)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid date range", "غلط تاریخ کی حد")
		return
	}
	profit, err := h.svc.GetProfitLossAccrual(r.Context(), start, end)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Report failed", "رپورٹ نہیں بن سکی")
		return
	}
	respondJSON(w, http.StatusOK, map[string]float64{"profit": profit})
}

func parseDateRange(r *http.Request) (time.Time, time.Time, error) {
	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")
	if startStr == "" || endStr == "" {
		return time.Time{}, time.Time{}, errors.New("start and end dates are required")
	}
	start, err := time.Parse("2006-01-02", startStr)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	end, err := time.Parse("2006-01-02", endStr)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	if end.Before(start) {
		return time.Time{}, time.Time{}, errors.New("end date must be on or after start date")
	}
	end = end.Add(24*time.Hour - time.Nanosecond)
	return start, end, nil
}
