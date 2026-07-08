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
	respondJSON(w, http.StatusOK, input)
}

func (h *ProductHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if err := h.svc.Delete(r.Context(), id); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Delete failed", "ڈیلیٹ ناکام")
		return
	}
	audit.Log(r.Context(), "DELETE", "product", id, "", getUserID(r))
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