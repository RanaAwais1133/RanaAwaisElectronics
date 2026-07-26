package handler

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository/sqlite"
)

type SupplierHandler struct {
	repo *sqlite.SupplierRepository
}

func NewSupplierHandler(repo *sqlite.SupplierRepository) *SupplierHandler {
	return &SupplierHandler{repo: repo}
}

// ─── Suppliers CRUD ───
func (h *SupplierHandler) Create(w http.ResponseWriter, r *http.Request) {
	var s domain.Supplier
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}
	if s.Name == "" {
		respondError(w, r, http.StatusBadRequest, "Name required", "نام ضروری ہے")
		return
	}
	if err := h.repo.CreateSupplier(r.Context(), &s); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "سپلائر نہیں بنا")
		return
	}
	respondJSON(w, http.StatusCreated, s)
}

func (h *SupplierHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	s, err := h.repo.GetSupplier(r.Context(), id)
	if err != nil || s == nil {
		respondError(w, r, http.StatusNotFound, "Not found", "نہیں ملا")
		return
	}
	respondJSON(w, http.StatusOK, s)
}

func (h *SupplierHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var s domain.Supplier
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}
	if err := h.repo.UpdateSupplier(r.Context(), id, &s); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Update failed", "اپڈیٹ ناکام")
		return
	}
	respondJSON(w, http.StatusOK, s)
}

func (h *SupplierHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if err := h.repo.DeleteSupplier(r.Context(), id); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Delete failed", "ڈیلیٹ ناکام")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "Deleted"})
}

func (h *SupplierHandler) List(w http.ResponseWriter, r *http.Request) {
	list, err := h.repo.ListSuppliers(r.Context())
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "List failed", "فہرست ناکام")
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"data": list, "total": len(list)})
}

// ─── Purchases ───
func (h *SupplierHandler) CreatePurchase(w http.ResponseWriter, r *http.Request) {
	var p domain.Purchase
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}
	if p.SupplierID == "" {
		respondError(w, r, http.StatusBadRequest, "Supplier required", "سپلائر ضروری ہے")
		return
	}
	if err := h.repo.CreatePurchase(r.Context(), &p); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "خریداری ناکام")
		return
	}
	// Auto-create promise for hybrid/credit
	if p.PaymentMode != "cash" && p.RemainingAmount > 0 && p.DueDate != nil {
		pr := domain.SupplierPromise{
			SupplierID: p.SupplierID,
			PurchaseID: p.ID,
			Amount:     p.RemainingAmount,
			DueDate:    *p.DueDate,
			PaidAmount: 0,
			Status:     "pending",
		}
		_ = h.repo.CreatePromise(r.Context(), &pr)
	}
	respondJSON(w, http.StatusCreated, p)
}

func (h *SupplierHandler) GetPurchase(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	p, err := h.repo.GetPurchase(r.Context(), id)
	if err != nil || p == nil {
		respondError(w, r, http.StatusNotFound, "Not found", "نہیں ملا")
		return
	}
	respondJSON(w, http.StatusOK, p)
}

func (h *SupplierHandler) ListPurchases(w http.ResponseWriter, r *http.Request) {
	supplierID := r.URL.Query().Get("supplierId")
	list, err := h.repo.ListPurchases(r.Context(), supplierID)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "List failed", "فہرست ناکام")
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"data": list, "total": len(list)})
}

// ─── Payments ───
func (h *SupplierHandler) CreatePayment(w http.ResponseWriter, r *http.Request) {
	var pay domain.SupplierPayment
	if err := json.NewDecoder(r.Body).Decode(&pay); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}
	if err := h.repo.CreatePayment(r.Context(), &pay); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Payment failed", "ادائیگی ناکام")
		return
	}
	// Update purchase paid_amount if purchaseId provided
	if pay.PurchaseID != "" {
		p, _ := h.repo.GetPurchase(r.Context(), pay.PurchaseID)
		if p != nil {
			newPaid := p.PaidAmount + pay.Amount
			if newPaid >= p.TotalAmount {
				p.Status = "completed"
			} else {
				p.Status = "partial"
			}
			p.PaidAmount = newPaid
			p.RemainingAmount = p.TotalAmount - newPaid
			_ = h.repo.UpdatePurchasePaid(r.Context(), pay.PurchaseID, newPaid, p.RemainingAmount, p.Status)
		}
	}
	respondJSON(w, http.StatusCreated, pay)
}

func (h *SupplierHandler) ListPayments(w http.ResponseWriter, r *http.Request) {
	supplierID := r.URL.Query().Get("supplierId")
	list, err := h.repo.ListPayments(r.Context(), supplierID)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "List failed", "فہرست ناکام")
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"data": list, "total": len(list)})
}

// ─── Promises ───
func (h *SupplierHandler) CreatePromise(w http.ResponseWriter, r *http.Request) {
	var pr domain.SupplierPromise
	if err := json.NewDecoder(r.Body).Decode(&pr); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}
	if err := h.repo.CreatePromise(r.Context(), &pr); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Promise failed", "وعدہ ناکام")
		return
	}
	respondJSON(w, http.StatusCreated, pr)
}

func (h *SupplierHandler) ListPromises(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	list, err := h.repo.ListPromises(r.Context(), status)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "List failed", "فہرست ناکام")
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"data": list, "total": len(list)})
}

func (h *SupplierHandler) UpdatePromise(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var pr domain.SupplierPromise
	if err := json.NewDecoder(r.Body).Decode(&pr); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}
	if err := h.repo.UpdatePromise(r.Context(), id, &pr); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Update failed", "اپڈیٹ ناکام")
		return
	}
	respondJSON(w, http.StatusOK, pr)
}