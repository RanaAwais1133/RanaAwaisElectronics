package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	repomongo "github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository/mongodb"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository/sqlite"
	"github.com/google/uuid"
)

type SupplierHandler struct {
	repo      *sqlite.SupplierRepository
	mongoRepo *repomongo.SupplierMongoRepo
}

func NewSupplierHandler(repo *sqlite.SupplierRepository) *SupplierHandler {
	return &SupplierHandler{
		repo:      repo,
		mongoRepo: repomongo.NewSupplierMongoRepo(config.MongoDatabase),
	}
}

// addToInventory adds product + inventory_item to MongoDB (and SQLite fallback)
func (h *SupplierHandler) addToInventory(name, serial, imei, chassis, engine, model, color string, purchasePrice, salePrice float64) {
	productID := uuid.New().String()
	now := time.Now()

	// MongoDB primary
	if config.MongoDatabase != nil {
		// 1. Add to products collection
		config.MongoDatabase.Collection("products").InsertOne(context.Background(), domain.Product{
			ID:            productID,
			Name:          name, NameUrdu: name, Category: "Purchase",
			Price:         salePrice, PurchasePrice: purchasePrice,
			SerialNumber:  serial, IMEI: imei, ChassisNo: chassis,
			EngineNo:      engine, Model: model, Color: color,
			InStock: true, StockCount: 1,
			CreatedAt: now, UpdatedAt: now,
		})
		// 2. Add to inventory_items collection for full tracking
		config.MongoDatabase.Collection("inventory_items").InsertOne(context.Background(), domain.InventoryItem{
			ID:            uuid.New().String(),
			ProductID:     productID,
			SerialNumber:  serial, IMEI: imei, ChassisNo: chassis,
			EngineNo:      engine, Model: model, Color: color,
			Status:        "in_stock",
			PurchaseDate:  now,
			PurchasePrice: purchasePrice,
			SellingPrice:  salePrice,
			CreatedAt:     now, UpdatedAt: now,
		})
	}
	// SQLite backup
	if db := config.GetSQLiteDB(); db != nil {
		db.Exec(`INSERT INTO products (id, name, name_urdu, category, price, purchase_price, serial_number, imei, chassis_no, engine_no, model, color, in_stock, stock_count, created_at, updated_at)
			VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
			productID, name, name, "Purchase", salePrice, purchasePrice, serial, imei, chassis, engine, model, color, 1, 1, now, now)
		// Also add to inventory_items for full tracking
		db.Exec(`INSERT INTO inventory_items (id, product_id, serial_number, imei, chassis_no, engine_no, model, color, status, purchase_date, purchase_price, selling_price, created_at, updated_at)
			VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
			uuid.New().String(), productID, serial, imei, chassis, engine, model, color, "in_stock", now, purchasePrice, salePrice, now, now)
	}
}

// ─── MONGODB HELPER: return true if mongo data was used ───
func (h *SupplierHandler) useMongo() bool { return h.mongoRepo != nil }

// ─── Suppliers ───
func (h *SupplierHandler) Create(w http.ResponseWriter, r *http.Request) {
	var s domain.Supplier
	json.NewDecoder(r.Body).Decode(&s)
	if s.Name == "" { respondError(w, r, 400, "Name required", "نام"); return }
	if h.useMongo() { h.mongoRepo.CreateSupplier(r.Context(), &s) }
	h.repo.CreateSupplier(r.Context(), &s)
	respondJSON(w, 201, s)
}

func (h *SupplierHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if h.useMongo() { if s, _ := h.mongoRepo.GetSupplier(r.Context(), id); s != nil { respondJSON(w, 200, s); return } }
	s, err := h.repo.GetSupplier(r.Context(), id)
	if err != nil || s == nil { respondError(w, r, 404, "Not found", "نہیں"); return }
	respondJSON(w, 200, s)
}

func (h *SupplierHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var s domain.Supplier
	json.NewDecoder(r.Body).Decode(&s)
	if h.useMongo() { h.mongoRepo.UpdateSupplier(r.Context(), id, &s) }
	if err := h.repo.UpdateSupplier(r.Context(), id, &s); err != nil { respondError(w, r, 500, "Failed", "ناکام"); return }
	respondJSON(w, 200, s)
}

func (h *SupplierHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if h.useMongo() { h.mongoRepo.DeleteSupplier(r.Context(), id) }
	h.repo.DeleteSupplier(r.Context(), id)
	respondJSON(w, 200, map[string]string{"message": "Deleted"})
}

func (h *SupplierHandler) List(w http.ResponseWriter, r *http.Request) {
	// MongoDB PRIMARY for list
	if h.useMongo() {
		list, err := h.mongoRepo.ListSuppliers(r.Context())
		if err == nil && len(list) > 0 {
			respondJSON(w, 200, map[string]interface{}{"data": list, "total": len(list)})
			return
		}
	}
	// SQLite fallback
	list, err := h.repo.ListSuppliers(r.Context())
	if err != nil { respondError(w, r, 500, "Failed", "ناکام"); return }
	if list == nil { list = []domain.Supplier{} }
	respondJSON(w, 200, map[string]interface{}{"data": list, "total": len(list)})
}

// ─── Purchases ───
func (h *SupplierHandler) CreatePurchase(w http.ResponseWriter, r *http.Request) {
	var p domain.Purchase
	json.NewDecoder(r.Body).Decode(&p)
	if p.SupplierID == "" { respondError(w, r, 400, "Supplier required", "سپلائر"); return }

	// MongoDB PRIMARY save
	if h.useMongo() {
		if err := h.mongoRepo.CreatePurchase(r.Context(), &p); err != nil {
			respondError(w, r, 500, err.Error(), "خریداری ناکام"); return
		}
	}
	// SQLite silent backup
	_ = h.repo.CreatePurchase(r.Context(), &p)

	// Add each item to inventory (MongoDB + SQLite)
	for _, item := range p.Items {
		h.addToInventory(item.ProductName, item.SerialNumber, item.IMEI, item.ChassisNo, item.EngineNo, item.Model, item.Color, item.Price, item.SalePrice)
	}

	// Auto-create promise for hybrid/credit
	if p.PaymentMode != "cash" && p.RemainingAmount > 0 && p.DueDate != nil {
		pr := domain.SupplierPromise{
			SupplierID: p.SupplierID, PurchaseID: p.ID, Amount: p.RemainingAmount,
			DueDate: *p.DueDate, Status: "pending",
		}
		if h.useMongo() { h.mongoRepo.CreatePromise(r.Context(), &pr) }
		h.repo.CreatePromise(r.Context(), &pr)
	}
	respondJSON(w, 201, p)
}

func (h *SupplierHandler) GetPurchase(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if h.useMongo() { if p, _ := h.mongoRepo.GetPurchase(r.Context(), id); p != nil { respondJSON(w, 200, p); return } }
	p, err := h.repo.GetPurchase(r.Context(), id)
	if err != nil || p == nil { respondError(w, r, 404, "Not found", "نہیں"); return }
	respondJSON(w, 200, p)
}

func (h *SupplierHandler) ListPurchases(w http.ResponseWriter, r *http.Request) {
	supplierID := r.URL.Query().Get("supplierId")
	// MongoDB PRIMARY for list
	if h.useMongo() {
		list, err := h.mongoRepo.ListPurchases(r.Context(), supplierID)
		if err == nil { respondJSON(w, 200, map[string]interface{}{"data": list, "total": len(list)}); return }
	}
	list, err := h.repo.ListPurchases(r.Context(), supplierID)
	if err != nil { respondError(w, r, 500, "Failed", "ناکام"); return }
	if list == nil { list = []domain.Purchase{} }
	respondJSON(w, 200, map[string]interface{}{"data": list, "total": len(list)})
}

// ─── Payments ───
func (h *SupplierHandler) CreatePayment(w http.ResponseWriter, r *http.Request) {
	var pay domain.SupplierPayment
	json.NewDecoder(r.Body).Decode(&pay)

	// Auto-find purchase if purchaseId not provided: pick first purchase with remaining > 0
	if pay.PurchaseID == "" && pay.SupplierID != "" {
		purchases, _ := h.repo.ListPurchases(r.Context(), pay.SupplierID)
		for _, p := range purchases {
			if p.RemainingAmount > 0 && p.Status != "completed" {
				pay.PurchaseID = p.ID
				break
			}
		}
		// Also try MongoDB if SQLite returned nothing
		if pay.PurchaseID == "" && h.useMongo() {
			if mongoList, err := h.mongoRepo.ListPurchases(r.Context(), pay.SupplierID); err == nil {
				for _, p := range mongoList {
					if p.RemainingAmount > 0 && p.Status != "completed" {
						pay.PurchaseID = p.ID
						break
					}
				}
			}
		}
	}

	// Prevent overpayment: cap amount at remaining
	if pay.PurchaseID != "" {
		var p *domain.Purchase
		if h.useMongo() { p, _ = h.mongoRepo.GetPurchase(r.Context(), pay.PurchaseID) }
		if p == nil { p, _ = h.repo.GetPurchase(r.Context(), pay.PurchaseID) }
		if p != nil {
			if p.Status == "completed" {
				respondError(w, r, 400, "Purchase already fully paid", "خریداری پہلے ہی مکمل ادا شدہ ہے")
				return
			}
			if pay.Amount > p.RemainingAmount {
				pay.Amount = p.RemainingAmount // Cap to remaining
			}
			if pay.Amount <= 0 {
				respondError(w, r, 400, "No remaining amount to pay", "ادائیگی کے لیے کوئی بقایا نہیں")
				return
			}
		}
	}

	// Save payment
	if h.useMongo() { h.mongoRepo.CreatePayment(r.Context(), &pay) }
	h.repo.CreatePayment(r.Context(), &pay)

	// Update purchase paid_amount
	if pay.PurchaseID != "" {
		var p *domain.Purchase
		if h.useMongo() { p, _ = h.mongoRepo.GetPurchase(r.Context(), pay.PurchaseID) }
		if p == nil { p, _ = h.repo.GetPurchase(r.Context(), pay.PurchaseID) }
		if p != nil {
			newPaid := p.PaidAmount + pay.Amount
			newRemaining := p.TotalAmount - newPaid
			if newRemaining < 0 { newRemaining = 0 }
			st := "partial"
			if newPaid >= p.TotalAmount { st = "completed" }
			h.repo.UpdatePurchasePaid(r.Context(), pay.PurchaseID, newPaid, newRemaining, st)
			if h.useMongo() {
				h.mongoRepo.UpdatePurchasePaid(r.Context(), pay.PurchaseID, newPaid, newRemaining, st)
			}
		}
	}
	respondJSON(w, 201, pay)
}

func (h *SupplierHandler) ListPayments(w http.ResponseWriter, r *http.Request) {
	supplierID := r.URL.Query().Get("supplierId")
	if h.useMongo() {
		list, err := h.mongoRepo.ListPayments(r.Context(), supplierID)
		if err == nil { respondJSON(w, 200, map[string]interface{}{"data": list, "total": len(list)}); return }
	}
	list, err := h.repo.ListPayments(r.Context(), supplierID)
	if err != nil { respondError(w, r, 500, "Failed", "ناکام"); return }
	if list == nil { list = []domain.SupplierPayment{} }
	respondJSON(w, 200, map[string]interface{}{"data": list, "total": len(list)})
}

// ─── Promises ───
func (h *SupplierHandler) CreatePromise(w http.ResponseWriter, r *http.Request) {
	var pr domain.SupplierPromise
	json.NewDecoder(r.Body).Decode(&pr)
	if h.useMongo() { h.mongoRepo.CreatePromise(r.Context(), &pr) }
	h.repo.CreatePromise(r.Context(), &pr)
	respondJSON(w, 201, pr)
}

func (h *SupplierHandler) ListPromises(w http.ResponseWriter, r *http.Request) {
	supplierID := r.URL.Query().Get("supplierId")
	if h.useMongo() {
		list, err := h.mongoRepo.ListPromises(r.Context(), supplierID)
		if err == nil { respondJSON(w, 200, map[string]interface{}{"data": list, "total": len(list)}); return }
	}
	_, _ = h.repo, supplierID // unused in fallback
	respondJSON(w, 200, map[string]interface{}{"data": []domain.SupplierPromise{}, "total": 0})
}

func (h *SupplierHandler) UpdatePromise(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var pr domain.SupplierPromise
	json.NewDecoder(r.Body).Decode(&pr)
	if h.useMongo() { h.mongoRepo.UpdatePromise(r.Context(), id, pr.PaidAmount, pr.Status) }
	h.repo.UpdatePromise(r.Context(), id, &pr)
	respondJSON(w, 200, pr)
}