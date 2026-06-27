package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/your-org/rana-awais-backend/internal/domain"
	"github.com/your-org/rana-awais-backend/internal/service"
	"github.com/your-org/rana-awais-backend/pkg/audit"
	"github.com/your-org/rana-awais-backend/pkg/validator"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CustomerHandler struct {
	svc *service.CustomerService
}

func NewCustomerHandler(svc *service.CustomerService) *CustomerHandler {
	return &CustomerHandler{svc: svc}
}

func (h *CustomerHandler) Create(w http.ResponseWriter, r *http.Request) {
	var c domain.Customer
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}

	// Allow either English or Urdu name
	if c.Name == "" && c.NameUrdu == "" {
		respondError(w, r, http.StatusBadRequest, "Name is required", "نام ضروری ہے")
		return
	}
	if c.Name == "" {
		c.Name = c.NameUrdu
	}
	if c.NameUrdu == "" {
		c.NameUrdu = c.Name
	}

	if c.FatherName == "" && c.FatherNameUrdu != "" {
		c.FatherName = c.FatherNameUrdu
	}
	if c.FatherNameUrdu == "" && c.FatherName != "" {
		c.FatherNameUrdu = c.FatherName
	}

	if c.Address == "" && c.AddressUrdu != "" {
		c.Address = c.AddressUrdu
	}
	if c.AddressUrdu == "" && c.Address != "" {
		c.AddressUrdu = c.Address
	}

	phone, _, err := validator.SanitizePhoneAndCNIC(c.Phone, "")
	if err != nil {
		respondError(w, r, http.StatusBadRequest, err.Error(), "فون نمبر غلط ہے")
		return
	}
	c.Phone = phone

	if err := h.svc.Create(r.Context(), &c); err != nil {
		respondError(w, r, http.StatusConflict, err.Error(), "گاہک نہیں بنایا جا سکا")
		return
	}
	audit.Log(r.Context(), "CREATE", "customer", c.ID.Hex(), "", getUserID(r))
	respondJSON(w, http.StatusCreated, c)
}

func (h *CustomerHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid ID", "غلط شناخت")
		return
	}
	cust, err := h.svc.GetByID(r.Context(), id)
	if err != nil || cust == nil {
		respondError(w, r, http.StatusNotFound, "Customer not found", "گاہک نہیں ملا")
		return
	}
	respondJSON(w, http.StatusOK, cust)
}

func (h *CustomerHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid ID", "غلط شناخت")
		return
	}

	existing, err := h.svc.GetByID(r.Context(), id)
	if err != nil || existing == nil {
		respondError(w, r, http.StatusNotFound, "Customer not found", "گاہک نہیں ملا")
		return
	}

	var input domain.Customer
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}

	if input.Name != "" {
		existing.Name = input.Name
	}
	if input.NameUrdu != "" {
		existing.NameUrdu = input.NameUrdu
	}
	if existing.Name == "" && existing.NameUrdu != "" {
		existing.Name = existing.NameUrdu
	}
	if existing.NameUrdu == "" && existing.Name != "" {
		existing.NameUrdu = existing.Name
	}

	if input.FatherName != "" {
		existing.FatherName = input.FatherName
	}
	if input.FatherNameUrdu != "" {
		existing.FatherNameUrdu = input.FatherNameUrdu
	}
	if existing.FatherName == "" && existing.FatherNameUrdu != "" {
		existing.FatherName = existing.FatherNameUrdu
	}
	if existing.FatherNameUrdu == "" && existing.FatherName != "" {
		existing.FatherNameUrdu = existing.FatherName
	}

	if input.Phone != "" {
		phone, _, err := validator.SanitizePhoneAndCNIC(input.Phone, "")
		if err != nil {
			respondError(w, r, http.StatusBadRequest, err.Error(), "فون نمبر غلط ہے")
			return
		}
		if phone != existing.Phone {
			dup, _ := h.svc.GetByPhone(r.Context(), phone)
			if dup != nil && dup.ID != existing.ID {
				respondError(w, r, http.StatusConflict, "Phone number already used", "یہ فون نمبر پہلے سے موجود ہے")
				return
			}
			existing.Phone = phone
		}
	}

	if input.CNIC != "" {
		existing.CNIC = input.CNIC
	}
	if input.Address != "" {
		existing.Address = input.Address
	}
	if input.AddressUrdu != "" {
		existing.AddressUrdu = input.AddressUrdu
	}
	if existing.Address == "" && existing.AddressUrdu != "" {
		existing.Address = existing.AddressUrdu
	}
	if existing.AddressUrdu == "" && existing.Address != "" {
		existing.AddressUrdu = existing.Address
	}

	// New fields for receipt
	if input.Residential != "" {
		existing.Residential = input.Residential
	}
	if input.Occupant != "" {
		existing.Occupant = input.Occupant
	}
	if input.ResidentialAddress != "" {
		existing.ResidentialAddress = input.ResidentialAddress
	}
	if input.OfficeAddress != "" {
		existing.OfficeAddress = input.OfficeAddress
	}
	if input.AccountNo != "" {
		existing.AccountNo = input.AccountNo
	}
	if input.CostNo != "" {
		existing.CostNo = input.CostNo
	}
	if input.ProcessNo != "" {
		existing.ProcessNo = input.ProcessNo
	}
	if input.ReprAsCost != "" {
		existing.ReprAsCost = input.ReprAsCost
	}
	if input.ReprAsGar != "" {
		existing.ReprAsGar = input.ReprAsGar
	}
	if input.PrepAC != "" {
		existing.PrepAC = input.PrepAC
	}

	if err := h.svc.Update(r.Context(), id, existing); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Update failed", "اپڈیٹ ناکام")
		return
	}

	audit.Log(r.Context(), "UPDATE", "customer", id.Hex(), "", getUserID(r))
	respondJSON(w, http.StatusOK, existing)
}

func (h *CustomerHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid ID", "غلط شناخت")
		return
	}

	if err := h.svc.Delete(r.Context(), id); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Delete failed", "ڈیلیٹ ناکام")
		return
	}

	audit.Log(r.Context(), "DELETE", "customer", id.Hex(), "", getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Customer deleted"})
}

func (h *CustomerHandler) List(w http.ResponseWriter, r *http.Request) {
	skip, _ := strconv.ParseInt(r.URL.Query().Get("skip"), 10, 64)
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	if limit == 0 {
		limit = 20
	}
	custs, err := h.svc.List(r.Context(), skip, limit)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to list", "گاہکوں کی فہرست نہیں لائی جا سکی")
		return
	}
	total, err := h.svc.Count(r.Context())
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to count", "گنتی نہیں ہو سکی")
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"data":  custs,
		"total": total,
	})
}

func (h *CustomerHandler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	skip, _ := strconv.ParseInt(r.URL.Query().Get("skip"), 10, 64)
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	if limit == 0 || limit > 50 {
		limit = 20
	}
	custs, err := h.svc.Search(r.Context(), query, skip, limit)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Search failed", "تلاش ناکام")
		return
	}
	respondJSON(w, http.StatusOK, custs)
}