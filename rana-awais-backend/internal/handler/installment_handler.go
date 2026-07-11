package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/audit"
)

type InstallmentHandler struct {
	svc     *service.InstallmentService
	guarSvc *service.GuarantorService
}

func NewInstallmentHandler(svc *service.InstallmentService, guarSvc *service.GuarantorService) *InstallmentHandler {
	return &InstallmentHandler{svc: svc, guarSvc: guarSvc}
}

func (h *InstallmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		CustomerID           string   `json:"customerId"`
		ProductID            string   `json:"productId"`
		InventoryItemID      string   `json:"inventoryItemId,omitempty"`
		GuarantorIDs         []string `json:"guarantorIds,omitempty"`
		TotalAmount          float64  `json:"totalAmount"`
		DownPayment          float64  `json:"downPayment"`
		RemainingAmount      float64  `json:"remainingAmount"`
		NumberOfInstallments int      `json:"numInstallments"`
		InstallmentAmount    float64  `json:"installmentAmount"`
		PerMonthInstallment  float64  `json:"perMonthInstallment"`
		StartDate            string   `json:"startDate"`
		EndDate              string   `json:"endDate"`
		GracePeriodDays      int      `json:"gracePeriodDays"`
		FinePerDay           float64  `json:"finePerDay"`
		FineType             string   `json:"fineType"`
		FixedFineAmount      float64  `json:"fixedFineAmount"`
		PaymentType          string   `json:"paymentType"`
		SerialNumber         string   `json:"serialNumber,omitempty"`
		IMEI                 string   `json:"imei,omitempty"`
		EngineNo             string   `json:"engineNo,omitempty"`
		ChassisNo            string   `json:"chassisNo,omitempty"`
		Model                string   `json:"model,omitempty"`
		Color                string   `json:"color,omitempty"`
		Company              string   `json:"company,omitempty"`
		CreatedBy            string   `json:"createdBy,omitempty"`
		InstallmentDate      int      `json:"installmentDate,omitempty"`
		ProcessFee           float64  `json:"processFee,omitempty"`
		Discount             float64  `json:"discount,omitempty"`
		SalaryIncome         float64  `json:"salaryIncome,omitempty"`
		Defaulter            string   `json:"defaulter,omitempty"`
		PTO                  string   `json:"pto,omitempty"`
		VPNStatus            string   `json:"vpnStatus,omitempty"`
		EmployeeStatus       string   `json:"employeeStatus,omitempty"`
		DBMRemarks           string   `json:"dbmRemarks,omitempty"`
		CRCRemarks           string   `json:"crcRemarks,omitempty"`
		ProcessAt            string   `json:"processAt,omitempty"`
		DOOfficer            string   `json:"doOfficer,omitempty"`
		MarkOff              string   `json:"markOff,omitempty"`
		DebtMng              string   `json:"debtMng,omitempty"`
		SecondMng            string   `json:"secondMng,omitempty"`
		InspOff              string   `json:"inspOff,omitempty"`
		SRM                  string   `json:"srm,omitempty"`
		MobilePhone          string   `json:"mobilePhone,omitempty"`
		CRC                  string   `json:"crc,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request body", "غلط درخواست")
		return
	}

	startDate, err := time.Parse("2006-01-02", payload.StartDate)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid start date", "غلط تاریخ")
		return
	}

	// ID will be set by the repository if empty
	plan := &domain.InstallmentPlan{
		CustomerID:           payload.CustomerID,
		ProductID:            payload.ProductID,
		InventoryItemID:      payload.InventoryItemID,
		GuarantorIDs:         payload.GuarantorIDs,
		TotalAmount:          payload.TotalAmount,
		DownPayment:          payload.DownPayment,
		RemainingAmount:      payload.RemainingAmount,
		NumberOfInstallments: payload.NumberOfInstallments,
		InstallmentAmount:    payload.PerMonthInstallment,
		StartDate:            startDate,
		GracePeriodDays:      payload.GracePeriodDays,
		FinePerDay:           payload.FinePerDay,
		FineType:             payload.FineType,
		FixedFineAmount:      payload.FixedFineAmount,
		PaymentType:          payload.PaymentType,
		SerialNumber:         payload.SerialNumber,
		IMEI:                 payload.IMEI,
		EngineNo:             payload.EngineNo,
		ChassisNo:            payload.ChassisNo,
		Model:                payload.Model,
		Color:                payload.Color,
		Company:              payload.Company,
		CreatedBy:            payload.CreatedBy,
		InstallmentDate:      payload.InstallmentDate,
		ProcessFee:           payload.ProcessFee,
		Discount:             payload.Discount,
		SalaryIncome:         payload.SalaryIncome,
		Defaulter:            payload.Defaulter,
		PTO:                  payload.PTO,
		VPNStatus:            payload.VPNStatus,
		EmployeeStatus:       payload.EmployeeStatus,
		DBMRemarks:           payload.DBMRemarks,
		CRCRemarks:           payload.CRCRemarks,
		ProcessAt:            payload.ProcessAt,
		DOOfficer:            payload.DOOfficer,
		MarkOff:              payload.MarkOff,
		DebtMng:              payload.DebtMng,
		SecondMng:            payload.SecondMng,
		InspOff:              payload.InspOff,
		SRM:                  payload.SRM,
		MobilePhone:          payload.MobilePhone,
		CRC:                  payload.CRC,
	}

	if payload.InstallmentAmount > 0 && payload.PerMonthInstallment == 0 {
		plan.InstallmentAmount = payload.InstallmentAmount
	}

	if err := h.svc.CreatePlan(r.Context(), plan); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "پلان نہیں بنایا جا سکا")
		return
	}
	audit.Log(r.Context(), "CREATE", "installment", plan.ID, "", getUserID(r))
	respondJSON(w, http.StatusCreated, plan)
}

func (h *InstallmentHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	plan, err := h.svc.GetPlanByID(r.Context(), id)
	if err != nil || plan == nil {
		respondError(w, r, http.StatusNotFound, "Plan not found", "پلان نہیں ملا")
		return
	}
	respondJSON(w, http.StatusOK, plan)
}

func (h *InstallmentHandler) ListByCustomer(w http.ResponseWriter, r *http.Request) {
	custID := r.URL.Query().Get("customer_id")
	if custID == "" {
		// Try to get from URL path variable
		custID = mux.Vars(r)["id"]
	}
	plans, err := h.svc.ListByCustomer(r.Context(), custID)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to list", "فہرست نہیں لائی جا سکی")
		return
	}
	respondJSON(w, http.StatusOK, plans)
}

func (h *InstallmentHandler) RecordPayment(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		PlanID         string  `json:"plan_id"`
		InstallmentNo  int     `json:"installment_no"`
		Amount         float64 `json:"amount"`
		Method         string  `json:"method"`
		PaymentDate    string  `json:"payment_date,omitempty"`
		DueDate        string  `json:"due_date,omitempty"`
		CollectedBy    string  `json:"collected_by,omitempty"`
		CollectedById  string  `json:"collected_by_id,omitempty"`
		Remarks        string  `json:"remarks,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request", "غلط درخواست")
		return
	}
	result, err := h.svc.RecordPayment(r.Context(), payload.PlanID, payload.InstallmentNo, payload.Amount, payload.Method, payload.PaymentDate, payload.DueDate, payload.CollectedBy, payload.CollectedById, payload.Remarks)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "ادائیگی ناکام")
		return
	}
	audit.Log(r.Context(), "PAYMENT", "installment", payload.PlanID, fmt.Sprintf("installment_no=%d amount=%.2f", payload.InstallmentNo, payload.Amount), getUserID(r))
	respondJSON(w, http.StatusOK, result)
}

func (h *InstallmentHandler) BulkPayment(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		PlanID        string                         `json:"plan_id"`
		Method        string                         `json:"method"`
		PaymentDate   string                         `json:"payment_date,omitempty"`
		CollectedBy   string                         `json:"collected_by,omitempty"`
		CollectedById string                         `json:"collected_by_id,omitempty"`
		Remarks       string                         `json:"remarks,omitempty"`
		Payments      []service.BulkPaymentItem `json:"payments"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request", "غلط درخواست")
		return
	}
	if err := h.svc.BulkPayment(r.Context(), payload.PlanID, payload.Payments, payload.Method, payload.PaymentDate, payload.CollectedBy, payload.CollectedById); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "ادائیگی ناکام")
		return
	}
	audit.Log(r.Context(), "BULK_PAYMENT", "installment", payload.PlanID, "", getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Payments recorded"})
}

func (h *InstallmentHandler) AdvancePayment(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		PlanID        string  `json:"plan_id"`
		Amount        float64 `json:"amount"`
		Method        string  `json:"method"`
		PaymentDate   string  `json:"payment_date,omitempty"`
		CollectedBy   string  `json:"collected_by,omitempty"`
		CollectedById string  `json:"collected_by_id,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request", "غلط درخواست")
		return
	}
	if err := h.svc.AdvancePayment(r.Context(), payload.PlanID, payload.Amount, payload.Method, payload.PaymentDate, payload.CollectedBy, payload.CollectedById); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "ایڈوانس ادائیگی ناکام")
		return
	}
	audit.Log(r.Context(), "ADVANCE_PAYMENT", "installment", payload.PlanID, "", getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Advance payment recorded"})
}

func (h *InstallmentHandler) Reschedule(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		PlanID             string `json:"plan_id"`
		Option             string `json:"option"`
		NewNumInstallments int    `json:"new_num_installments,omitempty"`
		NewStartDate       string `json:"new_start_date,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request", "غلط درخواست")
		return
	}
	if err := h.svc.ReschedulePlan(r.Context(), payload.PlanID, payload.Option, payload.NewNumInstallments, payload.NewStartDate); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "ری شیڈول ناکام")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "Rescheduled"})
}

func (h *InstallmentHandler) UndoPayment(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		PlanID string `json:"plan_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request", "غلط درخواست")
		return
	}
	if err := h.svc.UndoPayment(r.Context(), payload.PlanID); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "واپسی ناکام")
		return
	}
	audit.Log(r.Context(), "UNDO_PAYMENT", "installment", payload.PlanID, "", getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Payment undone"})
}

func (h *InstallmentHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var payload domain.InstallmentPlan
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request body", "غلط درخواست")
		return
	}
	if err := h.svc.UpdatePlan(r.Context(), id, &payload); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "پلان ایڈٹ نہیں ہوا")
		return
	}
	audit.Log(r.Context(), "EDIT_PLAN", "installment", id, "plan updated", getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Plan updated"})
}

func (h *InstallmentHandler) UpdateInstallmentDetail(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	planID := vars["planID"]
	installmentNoStr := vars["installmentNo"]
	installmentNo, err := strconv.Atoi(installmentNoStr)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid installment number", "غلط قسط نمبر")
		return
	}

	var payload domain.InstallmentDetail
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request body", "غلط درخواست")
		return
	}
	payload.InstallmentNo = installmentNo

	if err := h.svc.UpdateInstallmentDetail(r.Context(), planID, installmentNo, &payload); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "قسط ایڈٹ نہیں ہوئی")
		return
	}
	audit.Log(r.Context(), "EDIT_INSTALLMENT", "installment", planID,
		fmt.Sprintf("installment_no=%d", installmentNo), getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Installment updated"})
}

func (h *InstallmentHandler) UndoInstallment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	planID := vars["planID"]
	installmentNoStr := vars["installmentNo"]
	installmentNo, err := strconv.Atoi(installmentNoStr)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid installment number", "غلط قسط نمبر")
		return
	}

	if err := h.svc.UndoInstallment(r.Context(), planID, installmentNo); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "قسط واپس نہیں ہوئی")
		return
	}
	audit.Log(r.Context(), "UNDO_INSTALLMENT", "installment", planID,
		fmt.Sprintf("installment_no=%d reset to unpaid", installmentNo), getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Installment undone"})
}

func (h *InstallmentHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	skip := parseInt64(r.URL.Query().Get("skip"), 0)
	limit := parseInt64(r.URL.Query().Get("limit"), 100)
	plans, err := h.svc.ListAll(r.Context(), skip, limit)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "ڈیٹا حاصل کرنے میں ناکامی")
		return
	}
	if plans == nil {
		plans = []domain.InstallmentPlan{}
	}
	respondJSON(w, http.StatusOK, plans)
}

func (h *InstallmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if err := h.svc.DeletePlan(r.Context(), id); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "پلان ڈیلیٹ نہیں ہوا")
		return
	}
	audit.Log(r.Context(), "DELETE", "installment", id, "", getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Deleted"})
}
