package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/your-org/rana-awais-backend/internal/domain"
	"github.com/your-org/rana-awais-backend/internal/service"
	"github.com/your-org/rana-awais-backend/pkg/audit"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ProductHandler struct {
	svc *service.ProductService
}

func NewProductHandler(svc *service.ProductService) *ProductHandler {
	return &ProductHandler{svc: svc}
}

func (h *ProductHandler) Create(w http.ResponseWriter, r *http.Request) {
	var p domain.Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}

	// ✅ Allow either English or Urdu name
	if p.Name == "" && p.NameUrdu == "" {
		respondError(w, r, http.StatusBadRequest, "Name is required", "نام ضروری ہے")
		return
	}
	if p.Name == "" {
		p.Name = p.NameUrdu
	}
	if p.NameUrdu == "" {
		p.NameUrdu = p.Name
	}

	// ✅ Auto-fill company
	if p.Company == "" && p.CompanyUrdu != "" {
		p.Company = p.CompanyUrdu
	}
	if p.CompanyUrdu == "" && p.Company != "" {
		p.CompanyUrdu = p.Company
	}

	if err := h.svc.Create(r.Context(), &p); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Creation failed", "پروڈکٹ نہیں بنی")
		return
	}
	audit.Log(r.Context(), "CREATE", "product", p.ID.Hex(), "", getUserID(r))
	respondJSON(w, http.StatusCreated, p)
}

func (h *ProductHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid ID", "غلط شناخت")
		return
	}
	product, err := h.svc.GetByIDWithStock(r.Context(), id)
	if err != nil || product == nil {
		respondError(w, r, http.StatusNotFound, "Product not found", "پروڈکٹ نہیں ملی")
		return
	}
	respondJSON(w, http.StatusOK, product)
}

func (h *ProductHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid ID", "غلط شناخت")
		return
	}
	existing, err := h.svc.GetByID(r.Context(), id)
	if err != nil || existing == nil {
		respondError(w, r, http.StatusNotFound, "Product not found", "پروڈکٹ نہیں ملی")
		return
	}
	var input domain.Product
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}

	// ✅ Auto-fill Name/NameUrdu
	if input.Name != "" || input.NameUrdu != "" {
		if input.Name != "" {
			existing.Name = input.Name
		}
		if input.NameUrdu != "" {
			existing.NameUrdu = input.NameUrdu
		}
		// Auto-fill if one is empty
		if existing.Name == "" {
			existing.Name = existing.NameUrdu
		}
		if existing.NameUrdu == "" {
			existing.NameUrdu = existing.Name
		}
	}
	// ✅ Auto-fill Company/CompanyUrdu
	if input.Company != "" || input.CompanyUrdu != "" {
		if input.Company != "" {
			existing.Company = input.Company
		}
		if input.CompanyUrdu != "" {
			existing.CompanyUrdu = input.CompanyUrdu
		}
		if existing.Company == "" {
			existing.Company = existing.CompanyUrdu
		}
		if existing.CompanyUrdu == "" {
			existing.CompanyUrdu = existing.Company
		}
	}
	if input.Category != "" {
		existing.Category = input.Category
	}
	if input.Price != 0 {
		existing.Price = input.Price
	}
	if input.PurchasePrice != 0 {
		existing.PurchasePrice = input.PurchasePrice
	}
	if input.Description != "" {
		existing.Description = input.Description
	}
	// ✅ InStock auto-calculate based on stock count (frontend no longer sends this)
	// Only update if explicitly provided in the request body
	// We'll keep existing.InStock as-is since frontend doesn't send it anymore

	if err := h.svc.Update(r.Context(), id, existing); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Update failed", "اپڈیٹ ناکام")
		return
	}
	audit.Log(r.Context(), "UPDATE", "product", id.Hex(), "", getUserID(r))
	respondJSON(w, http.StatusOK, existing)
}

func (h *ProductHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid ID", "غلط شناخت")
		return
	}
	if err := h.svc.Delete(r.Context(), id); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Delete failed", "ڈیلیٹ ناکام")
		return
	}
	audit.Log(r.Context(), "DELETE", "product", id.Hex(), "", getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Product deleted"})
}

func (h *ProductHandler) List(w http.ResponseWriter, r *http.Request) {
	skip, _ := strconv.ParseInt(r.URL.Query().Get("skip"), 10, 64)
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	if limit == 0 {
		limit = 20
	}
	products, err := h.svc.List(r.Context(), skip, limit)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to list", "پروڈکٹس نہیں لائی جا سکیں")
		return
	}
	total, err := h.svc.Count(r.Context())
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to count", "گنتی نہیں ہو سکی")
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"data":  products,
		"total": total,
	})
}
