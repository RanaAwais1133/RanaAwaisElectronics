package handler

import (
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
)


type PaymentHandler struct {
	svc *service.PaymentService
}

func NewPaymentHandler(svc *service.PaymentService) *PaymentHandler {
	return &PaymentHandler{svc: svc}
}

func (h *PaymentHandler) ListByPlan(w http.ResponseWriter, r *http.Request) {
	planID := mux.Vars(r)["plan_id"]
	payments, err := h.svc.GetPaymentsByPlan(r.Context(), planID)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch payments", "ادائیگیاں نہیں لائی جا سکیں")
		return
	}
	respondJSON(w, http.StatusOK, payments)
}

func (h *PaymentHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	skipStr := r.URL.Query().Get("skip")
	
	limit, _ := strconv.ParseInt(limitStr, 10, 64)
	skip, _ := strconv.ParseInt(skipStr, 10, 64)
	
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	if skip < 0 {
		skip = 0
	}

	payments, err := h.svc.ListAll(r.Context(), skip, limit)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch payments", "ادائیگیاں نہیں لائی جا سکیں")
		return
	}
	if payments == nil {
		payments = []domain.Payment{}
	}
	respondJSON(w, http.StatusOK, payments)
}


