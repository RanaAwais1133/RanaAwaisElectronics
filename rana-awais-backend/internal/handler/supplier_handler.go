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
	// Raw decode to parse date strings properly
	var raw struct {
		SupplierID      string                 `json:"supplierId"`
		TotalAmount     float64                `json:"totalAmount"`
		PaidAmount      float64                `json:"paidAmount"`
		RemainingAmount float64                `json:"remainingAmount"`
		PaymentMode     string                 `json:"paymentMode"`
		DueDate         string                 `json:"dueDate"`
		Status          string                 `json:"status"`
		Remarks         string                 `json:"remarks"`
		CreatedBy       string                 `json:"createdBy"`
		Items           []domain.PurchaseItem  `json:"items"`
	}
	json.NewDecoder(r.Body).Decode(&raw)
	if raw.SupplierID == "" { respondError(w, r, 400, "Supplier required", "سپلائر"); return }

	// Parse dueDate string
	var dueDate *time.Time
	if raw.DueDate != "" {
		if parsed, err := time.Parse("2006-01-02", raw.DueDate); err == nil {
			dueDate = &parsed
		} else if parsed, err := time.Parse(time.RFC3339, raw.DueDate); err == nil {
			dueDate = &parsed
		}
	}

	p := domain.Purchase{
		SupplierID: raw.SupplierID, TotalAmount: raw.TotalAmount,
		PaidAmount: raw.PaidAmount, RemainingAmount: raw.RemainingAmount,
		PaymentMode: raw.PaymentMode, DueDate: dueDate,
		Status: raw.Status, Remarks: raw.Remarks,
		CreatedBy: raw.CreatedBy, Items: raw.Items,
	}
	// Smart status detection
	if p.PaidAmount >= p.TotalAmount {
		p.Status = "completed"
	} else if p.PaidAmount > 0 {
		p.Status = "partial"
	} else {
		p.Status = "pending"
	}

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
	// Use a raw decode first to handle date string properly
	var raw struct {
		SupplierID  string  `json:"supplierId"`
		PurchaseID  string  `json:"purchaseId"`
		Amount      float64 `json:"amount"`
		Method      string  `json:"method"`
		PaymentDate string  `json:"paymentDate"`
		Remarks     string  `json:"remarks"`
		CreatedBy   string  `json:"createdBy"`
	}
	json.NewDecoder(r.Body).Decode(&raw)

	// Parse date properly
	paymentDate := time.Now()
	if raw.PaymentDate != "" {
		if parsed, err := time.Parse("2006-01-02", raw.PaymentDate); err == nil {
			paymentDate = parsed
		} else if parsed, err := time.Parse(time.RFC3339, raw.PaymentDate); err == nil {
			paymentDate = parsed
		}
	}

	pay := domain.SupplierPayment{
		SupplierID: raw.SupplierID, PurchaseID: raw.PurchaseID,
		Amount: raw.Amount, Method: raw.Method,
		PaymentDate: paymentDate,
		Remarks: raw.Remarks, CreatedBy: raw.CreatedBy,
	}
	if pay.Method == "" { pay.Method = "cash" }

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
			if pay.Amount > p.RemainingAmount && p.RemainingAmount > 0 {
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

// ─── Supplier Ledger ───
func (h *SupplierHandler) GetLedger(w http.ResponseWriter, r *http.Request) {
	supplierID := mux.Vars(r)["id"]
	if supplierID == "" { respondError(w, r, 400, "Supplier required", "سپلائر"); return }

	type LedgerEntry struct {
		Date        time.Time `json:"date"`
		Description string    `json:"description"`
		Debit       float64   `json:"debit"`
		Credit      float64   `json:"credit"`
		Balance     float64   `json:"balance"`
		Type        string    `json:"type"` // "purchase" or "payment"
		RefID       string    `json:"refId"`
	}

	var entries []LedgerEntry
	var balance float64

	// Get all purchases for this supplier
	var purchases []domain.Purchase
	if h.useMongo() {
		purchases, _ = h.mongoRepo.ListPurchases(r.Context(), supplierID)
	}
	if len(purchases) == 0 {
		purchases, _ = h.repo.ListPurchases(r.Context(), supplierID)
	}

	// Get all payments for this supplier
	var pays []domain.SupplierPayment
	if h.useMongo() {
		pays, _ = h.mongoRepo.ListPayments(r.Context(), supplierID)
	}
	if len(pays) == 0 {
		pays, _ = h.repo.ListPayments(r.Context(), supplierID)
	}

	// Get all promises for this supplier
	var promis []domain.SupplierPromise
	if h.useMongo() {
		promis, _ = h.mongoRepo.ListPromises(r.Context(), supplierID)
	}

	// Build a combined timeline sorted by date
	type rawEntry struct {
		ts          time.Time
		description string
		debit       float64
		credit      float64
		typ         string
		refID       string
	}
	var raw []rawEntry

	for _, p := range purchases {
		desc := "Purchase"
		if len(p.Items) > 0 {
			names := ""
			for i, item := range p.Items {
				if i > 0 { names += ", " }
				if i >= 3 { names += "..."; break }
				names += item.ProductName
			}
			desc = "Purchase - " + names
		}
		raw = append(raw, rawEntry{ts: p.CreatedAt, description: desc, debit: p.TotalAmount, credit: 0, typ: "purchase", refID: p.ID})
	}

	for _, pay := range pays {
		method := pay.Method
		if method == "" { method = "cash" }
		raw = append(raw, rawEntry{ts: pay.PaymentDate, description: "Payment (" + method + ")", debit: 0, credit: pay.Amount, typ: "payment", refID: pay.ID})
	}

	// Sort by date ascending
	for i := 0; i < len(raw); i++ {
		for j := i+1; j < len(raw); j++ {
			if raw[j].ts.Before(raw[i].ts) {
				raw[i], raw[j] = raw[j], raw[i]
			}
		}
	}

	// Calculate running balance
	for _, e := range raw {
		balance += e.debit - e.credit
		entries = append(entries, LedgerEntry{
			Date: e.ts, Description: e.description,
			Debit: e.debit, Credit: e.credit,
			Balance: balance, Type: e.typ, RefID: e.refID,
		})
	}
	if entries == nil { entries = []LedgerEntry{} }

	// Calculate summary
	totalPurchased := 0.0
	totalPaid := 0.0
	totalPromises := 0.0
	for _, p := range purchases { totalPurchased += p.TotalAmount }
	for _, pay := range pays { totalPaid += pay.Amount }
	for _, pr := range promis { if pr.Status != "paid" { totalPromises += pr.Amount - pr.PaidAmount } }

	respondJSON(w, 200, map[string]interface{}{
		"entries": entries,
		"summary": map[string]interface{}{
			"totalPurchased": totalPurchased,
			"totalPaid":      totalPaid,
			"totalRemaining": totalPurchased - totalPaid,
			"pendingPromises": totalPromises,
			"balance":        balance,
		},
	})
}
