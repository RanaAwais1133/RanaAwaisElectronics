package handler

import (
	"net/http"

	"github.com/gorilla/mux"
	"github.com/your-org/rana-awais-backend/internal/service"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PaymentHandler struct {
	svc *service.PaymentService
}

func NewPaymentHandler(svc *service.PaymentService) *PaymentHandler {
	return &PaymentHandler{svc: svc}
}

func (h *PaymentHandler) ListByPlan(w http.ResponseWriter, r *http.Request) {
	planID, err := primitive.ObjectIDFromHex(mux.Vars(r)["plan_id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid plan ID", "غلط پلان شناخت")
		return
	}
	payments, err := h.svc.GetPaymentsByPlan(r.Context(), planID)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch payments", "ادائیگیاں نہیں لائی جا سکیں")
		return
	}
	respondJSON(w, http.StatusOK, payments)
}