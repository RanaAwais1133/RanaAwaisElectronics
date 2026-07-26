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

func (h *SupplierHandler) addToInventory(name, serial, imei, chassis, engine, model, color string, price float64) {
	db := config.MongoDatabase
	if db == nil {
		db2 := config.GetSQLiteDB()
		if db2 != nil {
			db2.Exec(`INSERT INTO products (id, name, name_urdu, category, price, purchase_price, serial_number, imei, chassis_no, engine_no, model, color, in_stock, stock_count, created_at, updated_at)
				VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
				uuid.New().String(), name, name, "Purchase", price, price, serial, imei, chassis, engine, model, color, 1, 1, time.Now(), time.Now())
		}
		return
	}
	coll := db.Collection("products")
	coll.InsertOne(context.Background(), domain.Product{
		ID:           uuid.New().String(),
		Name:         name,
		NameUrdu:     name,
		Category:     "Purchase",
		Price:        price,
		PurchasePrice: price,
		SerialNumber: serial,
		IMEI:         imei,
		ChassisNo:    chassis,
		EngineNo:      engine,
		Model:         model,
		Color:         color,
		InStock:       true,
		StockCount:    1,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	})
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
	if h.mongoRepo != nil {
		if err := h.mongoRepo.CreateSupplier(r.Context(), &s); err != nil {
			respondError(w, r, http.StatusInternalServerError, err.Error(), "سپلائر نہیں بنا")
			return
		}
	} else {
		if err := h.repo.CreateSupplier(r.Context(), &s); err != nil {
			respondError(w, r, http.StatusInternalServerError, err.Error(), "سپلائر نہیں بنا")
			return
		}
	}
	respondJSON(w, http.StatusCreated, s)
}

func (h *SupplierHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var s *domain.Supplier
	var err error
	if h.mongoRepo != nil { s, err = h.mongoRepo.GetSupplier(r.Context(), id) } else { s, err = h.repo.GetSupplier(r.Context(), id) }
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
	var err error
	if h.mongoRepo != nil { err = h.mongoRepo.UpdateSupplier(r.Context(), id, &s) } else { err = h.repo.UpdateSupplier(r.Context(), id, &s) }
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Update failed", "اپڈیٹ ناکام")
		return
	}
	respondJSON(w, http.StatusOK, s)
}

func (h *SupplierHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var err error
	if h.mongoRepo != nil { err = h.mongoRepo.DeleteSupplier(r.Context(), id) } else { err = h.repo.DeleteSupplier(r.Context(), id) }
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Delete failed", "ڈیلیٹ ناکام")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "Deleted"})
}

func (h *SupplierHandler) List(w http.ResponseWriter, r *http.Request) {
	var list []domain.Supplier
	var err error
	if h.mongoRepo != nil { list, err = h.mongoRepo.ListSuppliers(r.Context()) } else { list, err = h.repo.ListSuppliers(r.Context()) }
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
	// Save to MongoDB (persists on Render)
	if h.mongoRepo != nil {
		if err := h.mongoRepo.CreatePurchase(r.Context(), &p); err != nil {
			respondError(w, r, http.StatusInternalServerError, err.Error(), "خریداری ناکام")
			return
		}
	}
	// Also save to SQLite (local backup)
	_ = h.repo.CreatePurchase(r.Context(), &p)
	// ✅ Add each item as a product in inventory  
	for _, item := range p.Items {
		_ = h.repo.CreateProductFromPurchase(r.Context(), item)
		h.addToInventory(item.ProductName, item.SerialNumber, item.IMEI, item.ChassisNo, item.EngineNo, item.Model, item.Color, item.Price)
	}
	// Auto-create promise for hybrid/credit
	if p.PaymentMode != "cash" && p.RemainingAmount > 0 && p.DueDate != nil {
		pr := domain.SupplierPromise{
			SupplierID: p.SupplierID, PurchaseID: p.ID, Amount: p.RemainingAmount,
			DueDate: *p.DueDate, PaidAmount: 0, Status: "pending",
		}
		if h.mongoRepo != nil { _ = h.mongoRepo.CreatePromise(r.Context(), &pr) }
		_ = h.repo.CreatePromise(r.Context(), &pr)
	}
	respondJSON(w, http.StatusCreated, p)
}

func (h *SupplierHandler) GetPurchase(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var p *domain.Purchase
	var err error
	if h.mongoRepo != nil { p, err = h.mongoRepo.GetPurchase(r.Context(), id) } else { p, err = h.repo.GetPurchase(r.Context(), id) }
	if err != nil || p == nil {
		respondError(w, r, http.StatusNotFound, "Not found", "نہیں ملا")
		return
	}
	respondJSON(w, http.StatusOK, p)
}

func (h *SupplierHandler) ListPurchases(w http.ResponseWriter, r *http.Request) {
	supplierID := r.URL.Query().Get("supplierId")
	var list []domain.Purchase
	var err error
	if h.mongoRepo != nil { list, err = h.mongoRepo.ListPurchases(r.Context(), supplierID) } else { list, err = h.repo.ListPurchases(r.Context(), supplierID) }
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
	if h.mongoRepo != nil { _ = h.mongoRepo.CreatePayment(r.Context(), &pay) }
	if err := h.repo.CreatePayment(r.Context(), &pay); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Payment failed", "ادائیگی ناکام")
		return
	}
	if pay.PurchaseID != "" {
		p, _ := h.repo.GetPurchase(r.Context(), pay.PurchaseID)
		if p != nil {
			newPaid := p.PaidAmount + pay.Amount
			status := "partial"
			if newPaid >= p.TotalAmount { status = "completed" }
			_ = h.repo.UpdatePurchasePaid(r.Context(), pay.PurchaseID, newPaid, p.TotalAmount-newPaid, status)
			if h.mongoRepo != nil { _ = h.mongoRepo.UpdatePurchasePaid(r.Context(), pay.PurchaseID, newPaid, p.TotalAmount-newPaid, status) }
		}
	}
	respondJSON(w, http.StatusCreated, pay)
}

func (h *SupplierHandler) ListPayments(w http.ResponseWriter, r *http.Request) {
	supplierID := r.URL.Query().Get("supplierId")
	var list []domain.SupplierPayment
	var err error
	if h.mongoRepo != nil { list, err = h.mongoRepo.ListPayments(r.Context(), supplierID) } else { list, err = h.repo.ListPayments(r.Context(), supplierID) }
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
	if h.mongoRepo != nil { _ = h.mongoRepo.CreatePromise(r.Context(), &pr) }
	if err := h.repo.CreatePromise(r.Context(), &pr); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Promise failed", "وعدہ ناکام")
		return
	}
	respondJSON(w, http.StatusCreated, pr)
}

func (h *SupplierHandler) ListPromises(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	supplierID := r.URL.Query().Get("supplierId")
	var list []domain.SupplierPromise
	var err error
	if h.mongoRepo != nil { list, err = h.mongoRepo.ListPromises(r.Context(), supplierID) } else { list, err = h.repo.ListPromises(r.Context(), status) }
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
	if h.mongoRepo != nil { _ = h.mongoRepo.UpdatePromise(r.Context(), id, pr.PaidAmount, pr.Status) }
	if err := h.repo.UpdatePromise(r.Context(), id, &pr); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Update failed", "اپڈیٹ ناکام")
		return
	}
	respondJSON(w, http.StatusOK, pr)
}
