package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/your-org/rana-awais-backend/internal/domain"
	"github.com/your-org/rana-awais-backend/internal/service"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type InventoryHandler struct {
	svc     *service.InventoryService
	prodSvc *service.ProductService
}

func NewInventoryHandler(svc *service.InventoryService, prodSvc *service.ProductService) *InventoryHandler {
	return &InventoryHandler{svc: svc, prodSvc: prodSvc}
}

func (h *InventoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	var item domain.InventoryItem
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}
	if item.PurchaseDate.IsZero() {
		item.PurchaseDate = time.Now()
	}
	item.Status = "in_stock"
	if err := h.svc.Create(r.Context(), &item); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Creation failed", "آئٹم نہیں بن سکا")
		return
	}
	respondJSON(w, http.StatusCreated, item)
}

func (h *InventoryHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid ID", "غلط شناخت")
		return
	}
	item, err := h.svc.GetByID(r.Context(), id)
	if err != nil || item == nil {
		respondError(w, r, http.StatusNotFound, "Item not found", "آئٹم نہیں ملا")
		return
	}
	respondJSON(w, http.StatusOK, item)
}

func (h *InventoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid ID", "غلط شناخت")
		return
	}
	existing, err := h.svc.GetByID(r.Context(), id)
	if err != nil || existing == nil {
		respondError(w, r, http.StatusNotFound, "Item not found", "آئٹم نہیں ملا")
		return
	}

	var input domain.InventoryItem
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}

	if input.ProductID != primitive.NilObjectID {
		existing.ProductID = input.ProductID
	}
	if input.SerialNumber != "" {
		existing.SerialNumber = input.SerialNumber
	}
	if input.Color != "" {
		existing.Color = input.Color
	}
	if input.Model != "" {
		existing.Model = input.Model
	}
	if input.EngineNo != "" {
		existing.EngineNo = input.EngineNo
	}
	if input.ChassisNo != "" {
		existing.ChassisNo = input.ChassisNo
	}
	if input.IMEI != "" {
		existing.IMEI = input.IMEI
	}
	if input.Company != "" {
		existing.Company = input.Company
	}
	if input.Status != "" {
		existing.Status = input.Status
	}
	if !input.PurchaseDate.IsZero() {
		existing.PurchaseDate = input.PurchaseDate
	}
	if input.PurchasePrice != 0 {
		existing.PurchasePrice = input.PurchasePrice
	}
	if input.SellingPrice != 0 {
		existing.SellingPrice = input.SellingPrice
	}

	if err := h.svc.Update(r.Context(), id, existing); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Update failed", "اپڈیٹ ناکام")
		return
	}
	respondJSON(w, http.StatusOK, existing)
}

func (h *InventoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid ID", "غلط شناخت")
		return
	}
	if err := h.svc.Delete(r.Context(), id); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Delete failed", "ڈیلیٹ ناکام")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "Item deleted"})
}

func (h *InventoryHandler) List(w http.ResponseWriter, r *http.Request) {
	skip, _ := strconv.ParseInt(r.URL.Query().Get("skip"), 10, 64)
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	if limit == 0 {
		limit = 20
	}
	items, err := h.svc.List(r.Context(), skip, limit)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to list", "فہرست نہیں لائی جا سکی")
		return
	}

	var result []map[string]interface{}
	for _, item := range items {
		prod, _ := h.prodSvc.GetByID(r.Context(), item.ProductID)
		entry := map[string]interface{}{
			"id":            item.ID.Hex(),
			"productId":     item.ProductID.Hex(),
			"product_name":  "",
			"product_urdu":  "",
			"serialNumber":  item.SerialNumber,
			"color":         item.Color,
			"model":         item.Model,
			"engineNo":      item.EngineNo,
			"chassisNo":     item.ChassisNo,
			"imei":          item.IMEI,
			"company":       item.Company,
			"status":        item.Status,
			"purchaseDate":  item.PurchaseDate,
			"purchasePrice": item.PurchasePrice,
			"soldDate":      item.SoldDate,
			"createdAt":     item.CreatedAt,
			"updatedAt":     item.UpdatedAt,
		}
		if prod != nil {
			entry["product_name"] = prod.Name
			entry["product_urdu"] = prod.NameUrdu
		}
		result = append(result, entry)
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

func (h *InventoryHandler) AgeingReport(w http.ResponseWriter, r *http.Request) {
	days, _ := strconv.Atoi(r.URL.Query().Get("older_than_days"))
	if days == 0 {
		days = 90
	}
	items, err := h.svc.GetAgeingReport(r.Context(), days)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Report failed", "رپورٹ نہیں بن سکی")
		return
	}
	respondJSON(w, http.StatusOK, items)
}

func (h *InventoryHandler) AddStock(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ProductID     string  `json:"product_id"`
		Quantity      int     `json:"quantity"`
		PurchasePrice float64 `json:"purchase_price"`
		SellingPrice  float64 `json:"selling_price"`
		Color         string  `json:"color,omitempty"`
		Model         string  `json:"model,omitempty"`
		EngineNo      string  `json:"engineNo,omitempty"`
		ChassisNo     string  `json:"chassisNo,omitempty"`
		IMEI          string  `json:"imei,omitempty"`
		Company       string  `json:"company,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}

	productID, err := primitive.ObjectIDFromHex(payload.ProductID)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid product ID", "غلط پروڈکٹ شناخت")
		return
	}

	if payload.Quantity <= 0 {
		respondError(w, r, http.StatusBadRequest, "Quantity must be positive", "مقدار مثبت ہونی چاہیے")
		return
	}

	for i := 0; i < payload.Quantity; i++ {
		item := &domain.InventoryItem{
			ProductID:     productID,
			Status:        "in_stock",
			PurchaseDate:  time.Now(),
			PurchasePrice: payload.PurchasePrice,
			SellingPrice:  payload.SellingPrice,
			Color:         payload.Color,
			Model:         payload.Model,
			EngineNo:      payload.EngineNo,
			ChassisNo:     payload.ChassisNo,
			IMEI:          payload.IMEI,
			Company:       payload.Company,
		}
		if err := h.svc.Create(r.Context(), item); err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to add stock", "اسٹاک شامل کرنے میں ناکامی")
			return
		}
	}

	if payload.PurchasePrice > 0 {
		prod, err := h.prodSvc.GetByID(r.Context(), productID)
		if err == nil && prod != nil {
			prod.PurchasePrice = payload.PurchasePrice
			h.prodSvc.Update(r.Context(), productID, prod)
		}
	}

	respondJSON(w, http.StatusCreated, map[string]interface{}{"message": "Stock added successfully"})
}

func (h *InventoryHandler) RemoveStock(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}
	if len(payload.IDs) == 0 {
		respondError(w, r, http.StatusBadRequest, "No IDs provided", "کوئی شناخت نہیں دی گئی")
		return
	}

	for _, idStr := range payload.IDs {
		oid, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			continue
		}
		if err := h.svc.Delete(r.Context(), oid); err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to remove some items", "کچھ آئٹم ہٹانے میں ناکامی")
			return
		}
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "Items removed successfully"})
}

func (h *InventoryHandler) ReturnItem(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid ID", "غلط شناخت")
		return
	}
	item, err := h.svc.GetByID(r.Context(), id)
	if err != nil || item == nil {
		respondError(w, r, http.StatusNotFound, "Item not found", "آئٹم نہیں ملا")
		return
	}

	item.Status = "returned"
	item.SoldDate = nil
	if err := h.svc.Update(r.Context(), id, item); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to mark as returned", "واپسی کا نشان نہیں لگا")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "Item marked as returned"})
}