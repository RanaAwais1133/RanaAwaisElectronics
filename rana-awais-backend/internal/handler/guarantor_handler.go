package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/audit"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/validator"
	"go.mongodb.org/mongo-driver/bson/primitive"
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
		Name               string `json:"name"`
		NameUrdu           string `json:"nameUrdu"`
		FatherName         string `json:"fatherName"`
		FatherNameUrdu     string `json:"fatherNameUrdu"`
		Phone              string `json:"phone"`
		OfficePhone        string `json:"officePhone"`
		CNIC               string `json:"cnic"`
		Address            string `json:"address"`
		OfficeAddress      string `json:"officeAddress"`
		Occupation         string `json:"occupation"`
		Relation           string `json:"relation"`
		CustomerID         string `json:"customerId"`
		VerificationStatus string `json:"verificationStatus"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}

	phone, cnic, err := validator.SanitizePhoneAndCNIC(payload.Phone, payload.CNIC)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, err.Error(), "فون یا شناختی کارڈ غلط ہے")
		return
	}

	custID, err := primitive.ObjectIDFromHex(payload.CustomerID)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid customer ID", "غلط گاہک شناخت")
		return
	}

	if payload.Name == "" && payload.NameUrdu != "" {
		payload.Name = payload.NameUrdu
	}
	if payload.NameUrdu == "" && payload.Name != "" {
		payload.NameUrdu = payload.Name
	}
	if payload.FatherName == "" && payload.FatherNameUrdu != "" {
		payload.FatherName = payload.FatherNameUrdu
	}
	if payload.FatherNameUrdu == "" && payload.FatherName != "" {
		payload.FatherNameUrdu = payload.FatherName
	}

	g := domain.Guarantor{
		Name:               payload.Name,
		NameUrdu:           payload.NameUrdu,
		FatherName:         payload.FatherName,
		FatherNameUrdu:     payload.FatherNameUrdu,
		Phone:              phone,
		OfficePhone:        payload.OfficePhone,
		CNIC:               cnic,
		Address:            payload.Address,
		OfficeAddress:      payload.OfficeAddress,
		Occupation:         payload.Occupation,
		Relation:           payload.Relation,
		RelationToCustomer: payload.Relation,
		CustomerID:         custID,
		VerificationStatus: payload.VerificationStatus,
	}

	if err := h.svc.Create(r.Context(), &g); err != nil {
		respondError(w, r, http.StatusUnprocessableEntity, err.Error(), "ضامن نہیں بنایا جا سکا")
		return
	}
	audit.Log(r.Context(), "CREATE", "guarantor", g.ID.Hex(), "", getUserID(r))
	respondJSON(w, http.StatusCreated, g)
}

func (h *GuarantorHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid ID", "غلط شناخت")
		return
	}
	guarantor, err := h.svc.GetByID(r.Context(), id)
	if err != nil || guarantor == nil {
		respondError(w, r, http.StatusNotFound, "Guarantor not found", "ضامن نہیں ملا")
		return
	}
	respondJSON(w, http.StatusOK, guarantor)
}

func (h *GuarantorHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid ID", "غلط شناخت")
		return
	}
	existing, err := h.svc.GetByID(r.Context(), id)
	if err != nil || existing == nil {
		respondError(w, r, http.StatusNotFound, "Guarantor not found", "ضامن نہیں ملا")
		return
	}

	var payload struct {
		Name               string `json:"name"`
		NameUrdu           string `json:"nameUrdu"`
		FatherName         string `json:"fatherName"`
		FatherNameUrdu     string `json:"fatherNameUrdu"`
		Phone              string `json:"phone"`
		OfficePhone        string `json:"officePhone"`
		CNIC               string `json:"cnic"`
		Address            string `json:"address"`
		OfficeAddress      string `json:"officeAddress"`
		Occupation         string `json:"occupation"`
		Relation           string `json:"relation"`
		CustomerID         string `json:"customerId"`
		VerificationStatus string `json:"verificationStatus"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}

	if payload.Name != "" {
		existing.Name = payload.Name
	}
	if payload.NameUrdu != "" {
		existing.NameUrdu = payload.NameUrdu
	}
	if existing.Name == "" && existing.NameUrdu != "" {
		existing.Name = existing.NameUrdu
	}
	if existing.NameUrdu == "" && existing.Name != "" {
		existing.NameUrdu = existing.Name
	}
	if payload.FatherName != "" {
		existing.FatherName = payload.FatherName
	}
	if payload.FatherNameUrdu != "" {
		existing.FatherNameUrdu = payload.FatherNameUrdu
	}
	if existing.FatherName == "" && existing.FatherNameUrdu != "" {
		existing.FatherName = existing.FatherNameUrdu
	}
	if existing.FatherNameUrdu == "" && existing.FatherName != "" {
		existing.FatherNameUrdu = existing.FatherName
	}
	if payload.Phone != "" && payload.Phone != existing.Phone {
		rawPhone := strings.ReplaceAll(payload.Phone, "-", "")
		if len(rawPhone) == 11 && strings.HasPrefix(rawPhone, "03") {
			existing.Phone = rawPhone[:4] + "-" + rawPhone[4:]
		} else if validator.IsValidPhone(payload.Phone) {
			existing.Phone = payload.Phone
		} else {
			phone, _, err := validator.SanitizePhoneAndCNIC(rawPhone, "")
			if err != nil {
				respondError(w, r, http.StatusBadRequest, err.Error(), "فون نمبر غلط ہے")
				return
			}
			existing.Phone = phone
		}
	}
	if payload.OfficePhone != "" {
		existing.OfficePhone = payload.OfficePhone
	}
	if payload.CNIC != "" && payload.CNIC != existing.CNIC {
		rawCNIC := strings.ReplaceAll(payload.CNIC, "-", "")
		if len(rawCNIC) == 13 {
			existing.CNIC = rawCNIC[:5] + "-" + rawCNIC[5:12] + "-" + rawCNIC[12:]
		} else if validator.IsValidCNIC(payload.CNIC) {
			existing.CNIC = payload.CNIC
		} else {
			_, cnic, err := validator.SanitizePhoneAndCNIC("", rawCNIC)
			if err != nil {
				respondError(w, r, http.StatusBadRequest, err.Error(), "شناختی کارڈ غلط ہے")
				return
			}
			existing.CNIC = cnic
		}
	}
	if payload.Address != "" {
		existing.Address = payload.Address
	}
	if payload.OfficeAddress != "" {
		existing.OfficeAddress = payload.OfficeAddress
	}
	if payload.Occupation != "" {
		existing.Occupation = payload.Occupation
	}
	if payload.Relation != "" {
		existing.Relation = payload.Relation
		existing.RelationToCustomer = payload.Relation
	}
	if payload.CustomerID != "" {
		newCustID, err := primitive.ObjectIDFromHex(payload.CustomerID)
		if err != nil {
			respondError(w, r, http.StatusBadRequest, "Invalid customer ID", "غلط گاہک شناخت")
			return
		}
		if newCustID != existing.CustomerID {
			oldCust, _ := h.custSvc.GetByID(r.Context(), existing.CustomerID)
			if oldCust != nil {
				newGuarantorIDs := make([]primitive.ObjectID, 0)
				for _, gid := range oldCust.GuarantorIDs {
					if gid != id {
						newGuarantorIDs = append(newGuarantorIDs, gid)
					}
				}
				oldCust.GuarantorIDs = newGuarantorIDs
				h.custSvc.Update(r.Context(), oldCust.ID, oldCust)
			}
			newCust, _ := h.custSvc.GetByID(r.Context(), newCustID)
			if newCust != nil {
				alreadyExists := false
				for _, gid := range newCust.GuarantorIDs {
					if gid == id {
						alreadyExists = true
						break
					}
				}
				if !alreadyExists {
					newCust.GuarantorIDs = append(newCust.GuarantorIDs, id)
					h.custSvc.Update(r.Context(), newCust.ID, newCust)
				}
			}
			existing.CustomerID = newCustID
		}
	}
	if payload.VerificationStatus != "" {
		existing.VerificationStatus = payload.VerificationStatus
	}

	if err := h.svc.Update(r.Context(), id, existing); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Update failed", "اپڈیٹ ناکام")
		return
	}
	audit.Log(r.Context(), "UPDATE", "guarantor", id.Hex(), "", getUserID(r))
	respondJSON(w, http.StatusOK, existing)
}

func (h *GuarantorHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid ID", "غلط شناخت")
		return
	}
	if err := h.svc.Delete(r.Context(), id); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Delete failed", "ڈیلیٹ ناکام")
		return
	}
	audit.Log(r.Context(), "DELETE", "guarantor", id.Hex(), "", getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Guarantor deleted"})
}

func (h *GuarantorHandler) List(w http.ResponseWriter, r *http.Request) {
	skip, _ := strconv.ParseInt(r.URL.Query().Get("skip"), 10, 64)
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	if limit == 0 {
		limit = 20
	}
	guarantors, err := h.svc.List(r.Context(), skip, limit)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to list", "فہرست نہیں لائی جا سکی")
		return
	}

	var result []map[string]interface{}
	for _, g := range guarantors {
		cust, _ := h.custSvc.GetByID(r.Context(), g.CustomerID)
		item := map[string]interface{}{
			"id":                 g.ID.Hex(),
			"name":               g.Name,
			"nameUrdu":           g.NameUrdu,
			"fatherName":         g.FatherName,
			"father_name":        g.FatherName,
			"fatherNameUrdu":     g.FatherNameUrdu,
			"father_name_urdu":   g.FatherNameUrdu,
			"phone":              g.Phone,
			"officePhone":        g.OfficePhone,
			"cnic":               g.CNIC,
			"address":            g.Address,
			"officeAddress":      g.OfficeAddress,
			"occupation":         g.Occupation,
			"relation":           g.Relation,
			"verificationStatus": g.VerificationStatus,
			"customerId":         g.CustomerID.Hex(),
			"customerName":       "",
			"customerUrdu":       "",
		}
		if cust != nil {
			item["customerName"] = cust.Name
			item["customerUrdu"] = cust.NameUrdu
		}
		result = append(result, item)
	}
	total, err := h.svc.Count(r.Context())
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to count", "گنتی نہیں ہو سکی")
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"data":  result,
		"total": total,
	})
}

func (h *GuarantorHandler) ListByCustomer(w http.ResponseWriter, r *http.Request) {
	custIDStr := r.URL.Query().Get("customer_id")
	log.Println("🔍 customer_id received:", custIDStr)

	if custIDStr == "" {
		respondError(w, r, http.StatusBadRequest, "Missing customer_id", "گاہک کی شناخت نہیں دی")
		return
	}

	custID, err := primitive.ObjectIDFromHex(custIDStr)
	if err != nil {
		log.Println("❌ Invalid customer ID:", err)
		respondError(w, r, http.StatusBadRequest, "Invalid customer ID", "غلط گاہک شناخت")
		return
	}

	list, err := h.svc.ListByCustomer(r.Context(), custID)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to load guarantors", "ضامنوں کی فہرست نہیں لائی جا سکی")
		return
	}

	if list == nil {
		list = []domain.Guarantor{}
	}

	var result []map[string]interface{}
	for _, g := range list {
		cust, _ := h.custSvc.GetByID(r.Context(), g.CustomerID)
		item := map[string]interface{}{
			"id":                 g.ID.Hex(),
			"name":               g.Name,
			"nameUrdu":           g.NameUrdu,
			"fatherName":         g.FatherName,
			"father_name":        g.FatherName,
			"fatherNameUrdu":     g.FatherNameUrdu,
			"father_name_urdu":   g.FatherNameUrdu,
			"phone":              g.Phone,
			"officePhone":        g.OfficePhone,
			"cnic":               g.CNIC,
			"address":            g.Address,
			"officeAddress":      g.OfficeAddress,
			"occupation":         g.Occupation,
			"relation":           g.Relation,
			"verificationStatus": g.VerificationStatus,
			"customerId":         g.CustomerID.Hex(),
			"customerName":       "",
			"customerUrdu":       "",
		}
		if cust != nil {
			item["customerName"] = cust.Name
			item["customerUrdu"] = cust.NameUrdu
		}
		result = append(result, item)
	}
	respondJSON(w, http.StatusOK, result)
}
