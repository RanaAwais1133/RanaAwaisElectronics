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

type GuarantorHandler struct {
	svc     *service.GuarantorService
	custSvc *service.CustomerService
}

func NewGuarantorHandler(svc *service.GuarantorService, custSvc *service.CustomerService) *GuarantorHandler {
	return &GuarantorHandler{svc: svc, custSvc: custSvc}
}

func (h *GuarantorHandler) Create(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		CustomerID         string `json:"customerId"`
		Name               string `json:"name"`
		NameUrdu           string `json:"nameUrdu,omitempty"`
		FatherName         string `json:"fatherName,omitempty"`
		FatherNameUrdu     string `json:"fatherNameUrdu,omitempty"`
		Phone              string `json:"phone,omitempty"`
		OfficePhone        string `json:"officePhone,omitempty"`
		CNIC               string `json:"cnic,omitempty"`
		Address            string `json:"address,omitempty"`
		OfficeAddress      string `json:"officeAddress,omitempty"`
		Occupation         string `json:"occupation,omitempty"`
		Relation           string `json:"relation,omitempty"`
		RelationToCustomer string `json:"relationToCustomer,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}
	if payload.Name == "" {
		respondError(w, r, http.StatusBadRequest, "Name is required", "نام ضروری ہے")
		return
	}
	g := domain.Guarantor{
		CustomerID:         payload.CustomerID,
		Name:               payload.Name,
		NameUrdu:           payload.NameUrdu,
		FatherName:         payload.FatherName,
		FatherNameUrdu:     payload.FatherNameUrdu,
		Phone:              payload.Phone,
		OfficePhone:        payload.OfficePhone,
		CNIC:               payload.CNIC,
		Address:            payload.Address,
		OfficeAddress:      payload.OfficeAddress,
		Occupation:         payload.Occupation,
		Relation:           payload.Relation,
		RelationToCustomer: payload.RelationToCustomer,
	}
	if err := h.svc.Create(r.Context(), &g); err != nil {
		respondError(w, r, http.StatusConflict, err.Error(), "گارنٹر نہیں بنایا جا سکا")
		return
	}
	audit.Log(r.Context(), "CREATE", "guarantor", g.ID, "", getUserID(r))
	respondJSON(w, http.StatusCreated, g)
}

func (h *GuarantorHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	g, err := h.svc.GetByID(r.Context(), id)
	if err != nil || g == nil {
		respondError(w, r, http.StatusNotFound, "Guarantor not found", "گارنٹر نہیں ملا")
		return
	}
	respondJSON(w, http.StatusOK, g)
}

func (h *GuarantorHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	// Fetch existing guarantor first
	existing, err := h.svc.GetByID(r.Context(), id)
	if err != nil || existing == nil {
		respondError(w, r, http.StatusNotFound, "Guarantor not found", "گارنٹر نہیں ملا")
		return
	}

	// Decode partial update
	var input domain.Guarantor
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}

	// Merge: only update fields that were provided (non-zero values)
	if input.CustomerID != "" { existing.CustomerID = input.CustomerID }
	if input.Name != "" { existing.Name = input.Name }
	if input.NameUrdu != "" { existing.NameUrdu = input.NameUrdu }
	if input.FatherName != "" { existing.FatherName = input.FatherName }
	if input.FatherNameUrdu != "" { existing.FatherNameUrdu = input.FatherNameUrdu }
	if input.Phone != "" { existing.Phone = input.Phone }
	if input.OfficePhone != "" { existing.OfficePhone = input.OfficePhone }
	if input.CNIC != "" { existing.CNIC = input.CNIC }
	if input.CNICImage != "" { existing.CNICImage = input.CNICImage }
	if input.Photo != "" { existing.Photo = input.Photo }
	if input.Address != "" { existing.Address = input.Address }
	if input.OfficeAddress != "" { existing.OfficeAddress = input.OfficeAddress }
	if input.Occupation != "" { existing.Occupation = input.Occupation }
	if input.Relation != "" { existing.Relation = input.Relation }
	if input.RelationToCustomer != "" { existing.RelationToCustomer = input.RelationToCustomer }
	if input.VerificationStatus != "" { existing.VerificationStatus = input.VerificationStatus }

	if err := h.svc.Update(r.Context(), id, existing); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Update failed", "اپڈیٹ ناکام")
		return
	}
	audit.Log(r.Context(), "UPDATE", "guarantor", id, "", getUserID(r))
	respondJSON(w, http.StatusOK, existing)
}

func (h *GuarantorHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if err := h.svc.Delete(r.Context(), id); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to delete", "ڈیلیٹ ناکام")
		return
	}
	audit.Log(r.Context(), "DELETE", "guarantor", id, "", getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Guarantor deleted"})
}

func (h *GuarantorHandler) List(w http.ResponseWriter, r *http.Request) {
	skip, _ := strconv.ParseInt(r.URL.Query().Get("skip"), 10, 64)
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	if limit == 0 { limit = 20 }
	list, err := h.svc.List(r.Context(), skip, limit)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to list", "فہرست نہیں لائی جا سکی")
		return
	}

	// Enrich each guarantor with customer name lookup
	type enrichedGuarantor struct {
		domain.Guarantor
		CustomerName  string `json:"customerName"`
		CustomerUrdu  string `json:"customerUrdu"`
	}
	enriched := make([]enrichedGuarantor, len(list))
	for i, g := range list {
		enriched[i] = enrichedGuarantor{Guarantor: g}
		if g.CustomerID != "" && h.custSvc != nil {
			cust, err := h.custSvc.GetByID(r.Context(), g.CustomerID)
			if err == nil && cust != nil {
				enriched[i].CustomerName = cust.Name
				enriched[i].CustomerUrdu = cust.NameUrdu
			}
		}
	}

	total, _ := h.svc.Count(r.Context())
	respondJSON(w, http.StatusOK, map[string]interface{}{"data": enriched, "total": total})
}

func (h *GuarantorHandler) ListByCustomer(w http.ResponseWriter, r *http.Request) {
	custIDStr := r.URL.Query().Get("customer_id")
	list, err := h.svc.ListByCustomer(r.Context(), custIDStr)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to list", "فہرست نہیں لائی جا سکی")
		return
	}
	respondJSON(w, http.StatusOK, list)
}