package handler

import (
	"encoding/json"
	"net/http"

	"github.com/your-org/rana-awais-backend/internal/service"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type NotificationHandler struct {
	svc *service.NotificationService
}

func NewNotificationHandler(svc *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{svc: svc}
}

func (h *NotificationHandler) TriggerReminders(w http.ResponseWriter, r *http.Request) {
	err := h.svc.SendReminders(r.Context())
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Reminders failed", "یاددہانی نہیں بھیجی جا سکی")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "reminders sent"})
}

func (h *NotificationHandler) SendSingle(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		CustomerID        string `json:"customerId"`
		InstallmentPlanID string `json:"planId"`
		InstallmentNo     int    `json:"installmentNo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid payload", "غلط مواد")
		return
	}
	custID, err := primitive.ObjectIDFromHex(payload.CustomerID)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid customer ID", "غلط گاہک شناخت")
		return
	}
	planID, err := primitive.ObjectIDFromHex(payload.InstallmentPlanID)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid plan ID", "غلط پلان شناخت")
		return
	}
	if err := h.svc.SendSingleReminder(r.Context(), custID, planID, payload.InstallmentNo); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "ریمائنڈر نہیں بھیجا جا سکا")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "Reminder sent"})
}