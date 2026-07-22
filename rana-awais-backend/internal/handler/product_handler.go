package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/audit"
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
	if p.Name == "" {
		respondError(w, r, http.StatusBadRequest, "Name is required", "نام ضروری ہے")
		return
	}
	if err := h.svc.Create(r.Context(), &p); err != nil {
		respondError(w, r, http.StatusConflict, err.Error(), "پروڈکٹ نہیں بن سکی")
		return
	}
	audit.Log(r.Context(), "CREATE", "product", p.ID, "", getUserID(r))
	// ✅ Broadcast real-time event
	BroadcastProductEvent("product_created", p.ID, p)
	respondJSON(w, http.StatusCreated, p)
}

func (h *ProductHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	p, err := h.svc.GetByID(r.Context(), id)
	if err != nil || p == nil {
		respondError(w, r, http.StatusNotFound, "Product not found", "پروڈکٹ نہیں ملی")
		return
	}
	respondJSON(w, http.StatusOK, p)
}

func (h *ProductHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var input domain.Product
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}
	if err := h.svc.Update(r.Context(), id, &input); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Update failed", "اپڈیٹ ناکام")
		return
	}
	audit.Log(r.Context(), "UPDATE", "product", id, "", getUserID(r))
	// ✅ Broadcast real-time event
	BroadcastProductEvent("product_updated", id, input)
	respondJSON(w, http.StatusOK, input)
}

func (h *ProductHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if err := h.svc.Delete(r.Context(), id); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Delete failed", "ڈیلیٹ ناکام")
		return
	}
	audit.Log(r.Context(), "DELETE", "product", id, "", getUserID(r))
	// ✅ Broadcast real-time event
	BroadcastProductEvent("product_deleted", id, nil)
	respondJSON(w, http.StatusOK, map[string]string{"message": "Product deleted"})
}

func (h *ProductHandler) List(w http.ResponseWriter, r *http.Request) {
	skip, _ := strconv.ParseInt(r.URL.Query().Get("skip"), 10, 64)
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	if limit == 0 { limit = 10000 }
	category := r.URL.Query().Get("category")

	var prods []domain.Product
	var err error
	if category != "" {
		prods, err = h.svc.ListByCategory(r.Context(), category)
	} else {
		prods, err = h.svc.List(r.Context(), skip, limit)
	}
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to list", "پروڈکٹ فہرست نہیں لائی جا سکی")
		return
	}
	total, _ := h.svc.Count(r.Context())
	respondJSON(w, http.StatusOK, map[string]interface{}{"data": prods, "total": total})
}

// Search handles product search
func (h *ProductHandler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		respondError(w, r, http.StatusBadRequest, "Search query is required", "تلاش کا متن ضروری ہے")
		return
	}
	skip, _ := strconv.ParseInt(r.URL.Query().Get("skip"), 10, 64)
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	if limit == 0 { limit = 10000 }

	prods, err := h.svc.Search(r.Context(), query, skip, limit)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Search failed", "تلاش ناکام")
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"data": prods, "total": len(prods)})
}

// BulkDelete handles deleting multiple products at once
func (h *ProductHandler) BulkDelete(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}
	if len(payload.IDs) == 0 {
		respondError(w, r, http.StatusBadRequest, "No product IDs provided", "پروڈکٹ IDs درکار ہیں")
		return
	}
	if err := h.svc.BulkDelete(r.Context(), payload.IDs); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Bulk delete failed", "ایک ساتھ ڈیلیٹ ناکام")
		return
	}
	audit.Log(r.Context(), "BULK_DELETE", "product", "", "", getUserID(r))
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Products deleted successfully",
		"count":   len(payload.IDs),
	})
}

// GetLowStock returns products with low stock
func (h *ProductHandler) GetLowStock(w http.ResponseWriter, r *http.Request) {
	thresholdStr := r.URL.Query().Get("threshold")
	threshold := 5
	if thresholdStr != "" {
		if t, err := strconv.Atoi(thresholdStr); err == nil {
			threshold = t
		}
	}
	prods, err := h.svc.GetLowStock(r.Context(), threshold)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to get low stock products", "کم اسٹاک والی پروڈکٹس نہیں مل سکیں")
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"data": prods, "total": len(prods)})
}


