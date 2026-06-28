package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/audit"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
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
		SerialNumber         string   `json:"serialNumber,omitempty"`
		IMEI                 string   `json:"imei,omitempty"`
		EngineNo             string   `json:"engineNo,omitempty"`
		ChassisNo            string   `json:"chassisNo,omitempty"`
		Model                string   `json:"model,omitempty"`
		Color                string   `json:"color,omitempty"`
		Company              string   `json:"company,omitempty"`
		CreatedBy            string   `json:"createdBy,omitempty"`
		AdvanceAmount        float64  `json:"advanceAmount,omitempty"`
		AdvanceReceived      int      `json:"advanceReceived,omitempty"`
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

	custID, err := primitive.ObjectIDFromHex(payload.CustomerID)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid customer ID", "غلط گاہک شناخت")
		return
	}

	prodID, err := primitive.ObjectIDFromHex(payload.ProductID)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid product ID", "غلط پروڈکٹ شناخت")
		return
	}

	startDate, err := time.Parse("2006-01-02", payload.StartDate)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid start date format", "شروع کی تاریخ کا فارمیٹ غلط ہے")
		return
	}
	endDate, err := time.Parse("2006-01-02", payload.EndDate)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid end date format", "اختتامی تاریخ کا فارمیٹ غلط ہے")
		return
	}

	var inventoryItemID primitive.ObjectID
	if payload.InventoryItemID != "" {
		inventoryItemID, err = primitive.ObjectIDFromHex(payload.InventoryItemID)
		if err != nil {
			respondError(w, r, http.StatusBadRequest, "Invalid inventory item ID", "غلط انوینٹری آئٹم شناخت")
			return
		}
	}

	var guarantorIDs []primitive.ObjectID
	for _, id := range payload.GuarantorIDs {
		if len(guarantorIDs) >= 4 {
			break
		}
		oid, err := primitive.ObjectIDFromHex(id)
		if err == nil {
			exists := false
			for _, existing := range guarantorIDs {
				if existing == oid {
					exists = true
					break
				}
			}
			if !exists {
				guarantorIDs = append(guarantorIDs, oid)
			}
		}
	}

	plan := domain.InstallmentPlan{
		CustomerID:           custID,
		ProductID:            prodID,
		InventoryItemID:      inventoryItemID,
		GuarantorIDs:         guarantorIDs,
		TotalAmount:          payload.TotalAmount,
		DownPayment:          payload.DownPayment,
		RemainingAmount:      payload.RemainingAmount,
		NumberOfInstallments: payload.NumberOfInstallments,
		InstallmentAmount:    payload.InstallmentAmount,
		StartDate:            startDate,
		EndDate:              endDate,
		GracePeriodDays:      payload.GracePeriodDays,
		FinePerDay:           payload.FinePerDay,
		SerialNumber:         payload.SerialNumber,
		IMEI:                 payload.IMEI,
		EngineNo:             payload.EngineNo,
		ChassisNo:            payload.ChassisNo,
		Model:                payload.Model,
		Color:                payload.Color,
		Company:              payload.Company,
		CreatedBy:            payload.CreatedBy,
		AdvanceAmount:        payload.AdvanceAmount,
		AdvanceReceived:      payload.AdvanceReceived,
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

	if err := h.svc.CreatePlan(r.Context(), &plan); err != nil {
		respondError(w, r, http.StatusUnprocessableEntity, err.Error(), "پلان نہیں بن سکا")
		return
	}
	audit.Log(r.Context(), "CREATE", "installment_plan", plan.ID.Hex(), "", getUserID(r))
	respondJSON(w, http.StatusCreated, plan)
}

func (h *InstallmentHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid ID", "غلط شناخت")
		return
	}
	plan, err := h.svc.GetPlanByID(r.Context(), id)
	if err != nil || plan == nil {
		respondError(w, r, http.StatusNotFound, "Plan not found", "پلان نہیں ملا")
		return
	}

	type PlanWithProduct struct {
		domain.InstallmentPlan
		ProductName    string `json:"productName,omitempty"`
		ProductNameUrdu string `json:"productNameUrdu,omitempty"`
	}

	resp := PlanWithProduct{
		InstallmentPlan: *plan,
	}

	if prod, err := h.svc.GetProductByID(r.Context(), plan.ProductID); err == nil && prod != nil {
		resp.ProductName = prod.Name
		resp.ProductNameUrdu = prod.NameUrdu
	}

	respondJSON(w, http.StatusOK, resp)
}

func (h *InstallmentHandler) RecordPayment(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		PlanID        string  `json:"plan_id"`
		InstallmentNo int     `json:"installment_no"`
		Amount        float64 `json:"amount"`
		Method        string  `json:"method"`
		PaymentDate   string  `json:"payment_date"`
		DueDate       string  `json:"due_date"`
		CollectedBy   string  `json:"collected_by"`
		CollectedById string  `json:"collected_by_id"`
		Remarks       string  `json:"remarks"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid payload", "غلط مواد")
		return
	}
	
	planID, err := primitive.ObjectIDFromHex(payload.PlanID)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid plan ID", "غلط پلان شناخت")
		return
	}
	
	result, err := h.svc.RecordPayment(
		r.Context(),
		planID,
		payload.InstallmentNo,
		payload.Amount,
		payload.Method,
		payload.PaymentDate,
		payload.DueDate,
		payload.CollectedBy,
		payload.CollectedById,
		payload.Remarks,
	)
	if err != nil {
		respondError(w, r, http.StatusUnprocessableEntity, err.Error(), "ادائیگی ریکارڈ نہیں ہوئی")
		return
	}
	
	details := fmt.Sprintf("Amount: %.2f | Installment: %d | Method: %s | Remaining: %.2f | CollectedBy: %s",
		payload.Amount, payload.InstallmentNo, payload.Method, result.RemainingBalance, payload.CollectedBy)
	audit.Log(r.Context(), "PAYMENT", "installment_plan", planID.Hex(), details, getUserID(r))
	respondJSON(w, http.StatusOK, result)
}

func (h *InstallmentHandler) BulkPayment(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		PlanID       string                    `json:"plan_id"`
		Method       string                    `json:"method"`
		PaymentDate  string                    `json:"payment_date"`
		Payments     []service.BulkPaymentItem `json:"payments"`
		CollectedBy  string                    `json:"collected_by"`
		CollectedById string                   `json:"collected_by_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid payload", "غلط مواد")
		return
	}
	
	planID, err := primitive.ObjectIDFromHex(payload.PlanID)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid plan ID", "غلط پلان شناخت")
		return
	}
	
	err = h.svc.BulkPayment(
		r.Context(),
		planID,
		payload.Payments,
		payload.Method,
		payload.PaymentDate,
		payload.CollectedBy,
		payload.CollectedById,
	)
	if err != nil {
		respondError(w, r, http.StatusUnprocessableEntity, err.Error(), "بلک ادائیگی ناکام")
		return
	}
	
	totalPaid := 0.0
	instNos := ""
	for i, p := range payload.Payments {
		totalPaid += p.Amount
		if i > 0 {
			instNos += ","
		}
		instNos += strconv.Itoa(p.InstallmentNo)
	}
	details := fmt.Sprintf("Bulk Amount: %.2f | Installments: [%s] | Method: %s | Count: %d | CollectedBy: %s",
		totalPaid, instNos, payload.Method, len(payload.Payments), payload.CollectedBy)
	audit.Log(r.Context(), "BULK_PAYMENT", "installment_plan", planID.Hex(), details, getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Bulk payment recorded"})
}

func (h *InstallmentHandler) AdvancePayment(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		PlanID       string  `json:"plan_id"`
		Amount       float64 `json:"amount"`
		Method       string  `json:"method"`
		PaymentDate  string  `json:"payment_date"`
		CollectedBy  string  `json:"collected_by"`
		CollectedById string `json:"collected_by_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid payload", "غلط مواد")
		return
	}
	
	planID, err := primitive.ObjectIDFromHex(payload.PlanID)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid plan ID", "غلط پلان شناخت")
		return
	}
	
	err = h.svc.AdvancePayment(
		r.Context(),
		planID,
		payload.Amount,
		payload.Method,
		payload.PaymentDate,
		payload.CollectedBy,
		payload.CollectedById,
	)
	if err != nil {
		respondError(w, r, http.StatusUnprocessableEntity, err.Error(), "ایڈوانس ادائیگی ناکام")
		return
	}
	
	details := fmt.Sprintf("Advance Amount: %.2f | Method: %s | CollectedBy: %s", payload.Amount, payload.Method, payload.CollectedBy)
	audit.Log(r.Context(), "ADVANCE_PAYMENT", "installment_plan", planID.Hex(), details, getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Advance payment recorded"})
}

func (h *InstallmentHandler) ListByCustomer(w http.ResponseWriter, r *http.Request) {
	custID, err := primitive.ObjectIDFromHex(r.URL.Query().Get("customer_id"))
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid customer ID", "غلط گاہک شناخت")
		return
	}
	plans, err := h.svc.ListByCustomer(r.Context(), custID)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch plans", "پلان لانے میں ناکامی")
		return
	}

	db := config.DB
	paymentsColl := db.Collection("payments")
	type enrichedPlan struct {
		domain.InstallmentPlan
		Payments []bson.M `json:"payments"`
	}
	var enriched []enrichedPlan
	for _, plan := range plans {
		var payments []bson.M
		payCursor, err := paymentsColl.Find(r.Context(), bson.M{"installment_plan_id": plan.ID}, options.Find().SetSort(bson.M{"transaction_date": 1}))
		if err == nil {
			payCursor.All(r.Context(), &payments)
			payCursor.Close(r.Context())
		}
		if payments == nil {
			payments = []bson.M{}
		}
		enriched = append(enriched, enrichedPlan{
			InstallmentPlan: plan,
			Payments:        payments,
		})
	}
	if enriched == nil {
		enriched = []enrichedPlan{}
	}

	respondJSON(w, http.StatusOK, enriched)
}

func (h *InstallmentHandler) Reschedule(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		PlanID             string `json:"plan_id"`
		Option             string `json:"option"`
		NewNumInstallments int    `json:"new_num_installments"`
		NewStartDate       string `json:"new_start_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid payload", "غلط مواد")
		return
	}
	
	planID, err := primitive.ObjectIDFromHex(payload.PlanID)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid plan ID", "غلط پلان شناخت")
		return
	}
	
	err = h.svc.ReschedulePlan(r.Context(), planID, payload.Option, payload.NewNumInstallments, payload.NewStartDate)
	if err != nil {
		respondError(w, r, http.StatusUnprocessableEntity, err.Error(), "دوبارہ شیڈولنگ ناکام")
		return
	}
	audit.Log(r.Context(), "RESCHEDULE", "installment_plan", planID.Hex(), "Option: "+payload.Option, getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Plan rescheduled"})
}

func (h *InstallmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid ID", "غلط شناخت")
		return
	}
	if err := h.svc.DeletePlan(r.Context(), id); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "ڈیلیٹ ناکام")
		return
	}
	audit.Log(r.Context(), "DELETE", "installment_plan", id.Hex(), "", getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Plan deleted"})
}
