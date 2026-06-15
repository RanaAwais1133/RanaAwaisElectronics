package handler

import (
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/your-org/rana-awais-backend/internal/service"
	"github.com/your-org/rana-awais-backend/pkg/receipt"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ReceiptHandler struct {
	svc            *service.ReceiptService
	installmentSvc *service.InstallmentService
	custSvc        *service.CustomerService
	prodSvc        *service.ProductService
	guarSvc        *service.GuarantorService
}

func NewReceiptHandler(
	svc *service.ReceiptService,
	installmentSvc *service.InstallmentService,
	custSvc *service.CustomerService,
	prodSvc *service.ProductService,
	guarSvc *service.GuarantorService,
) *ReceiptHandler {
	return &ReceiptHandler{
		svc:            svc,
		installmentSvc: installmentSvc,
		custSvc:        custSvc,
		prodSvc:        prodSvc,
		guarSvc:        guarSvc,
	}
}

// DownloadReceipt generates and downloads a JPG receipt for an installment plan.
func (h *ReceiptHandler) DownloadReceipt(w http.ResponseWriter, r *http.Request) {
	planID, err := primitive.ObjectIDFromHex(mux.Vars(r)["plan_id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid plan ID", "غلط پلان شناخت")
		return
	}

	plan, err := h.installmentSvc.GetPlanByID(r.Context(), planID)
	if err != nil || plan == nil {
		respondError(w, r, http.StatusNotFound, "Plan not found", "پلان نہیں ملا")
		return
	}

	cust, err := h.custSvc.GetByID(r.Context(), plan.CustomerID)
	if err != nil || cust == nil {
		respondError(w, r, http.StatusNotFound, "Customer not found", "گاہک نہیں ملا")
		return
	}

	prod, err := h.prodSvc.GetByID(r.Context(), plan.ProductID)
	if err != nil || prod == nil {
		respondError(w, r, http.StatusNotFound, "Product not found", "پروڈکٹ نہیں ملی")
		return
	}

	guarantors, _ := h.guarSvc.ListByCustomer(r.Context(), plan.CustomerID)

	imgBytes, err := receipt.GenerateInstallmentReceipt(plan, cust, prod, guarantors)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to generate receipt", "رسید نہیں بن سکی")
		return
	}

	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Content-Disposition", "attachment; filename=receipt_"+plan.ID.Hex()+".jpg")
	w.Header().Set("Content-Length", strconv.Itoa(len(imgBytes)))
	w.Write(imgBytes)
}

// PrintReceipt (existing)
func (h *ReceiptHandler) PrintReceipt(w http.ResponseWriter, r *http.Request) {
	payID, err := primitive.ObjectIDFromHex(mux.Vars(r)["payment_id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid payment ID", "غلط ادائیگی شناخت")
		return
	}
	if err := h.svc.GenerateAndPrintReceipt(r.Context(), payID); err != nil {
		respondError(w, r, http.StatusUnprocessableEntity, "Print failed", "رسید پرنٹ نہیں ہوئی")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "printed"})
}