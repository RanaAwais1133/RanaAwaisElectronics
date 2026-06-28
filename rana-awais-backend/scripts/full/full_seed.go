package main

import (
	"context"
	"fmt"
	"log"
	"math"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.Load()
	config.ConnectDB(cfg)
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	log.Println("🚀 Starting full seed...")

	// ========== 1. CREATE ADMIN ==========
	seedAdmin(ctx)

	// ========== 2. CREATE CUSTOMERS ==========
	customers := seedCustomers(ctx)

	// ========== 3. CREATE GUARANTORS ==========
	seedGuarantors(ctx, customers)

	// ========== 4. CREATE PRODUCTS ==========
	products := seedProducts(ctx)

	// ========== 5. CREATE INVENTORY ==========
	seedInventory(ctx, products)

	// ========== 6. CREATE INSTALLMENT PLANS ==========
	plans := seedInstallmentPlans(ctx, customers, products)

	// ========== 7. RECORD SOME PAYMENTS ==========
	seedPayments(ctx, plans)

	log.Println("✅ Full seed completed!")
	log.Println("📋 Login: admin / admin123")
	log.Println("📋 Customers: 5 created")
	log.Println("📋 Guarantors: 10 created (2 per customer)")
	log.Println("📋 Products: 10 created")
	log.Println("📋 Installment Plans: 3 created")
	log.Println("📋 Payments: Some installments paid")
}

// ========== ADMIN ==========
func seedAdmin(ctx context.Context) {
	coll := config.DB.Collection("users")
	var existing domain.User
	if coll.FindOne(ctx, bson.M{"username": "admin"}).Decode(&existing) == nil {
		log.Println("ℹ️  Admin already exists")
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	admin := domain.User{
		ID:           primitive.NewObjectID(),
		Username:     "admin",
		PasswordHash: string(hash),
		Role:         "admin",
		DisplayName:  "Administrator",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	coll.InsertOne(ctx, admin)
	log.Println("✅ Admin created")
}

// ========== CUSTOMERS ==========
func seedCustomers(ctx context.Context) []domain.Customer {
	coll := config.DB.Collection("customers")
	customers := []domain.Customer{
		{ID: primitive.NewObjectID(), Name: "Muhammad Huzaifa", NameUrdu: "محمد حذیفہ", Phone: "03136487199", CNIC: "42201-1234567-1", Address: "House #12, Street 5, Gulshan-e-Iqbal", AddressUrdu: "گھر نمبر 12، گلی 5، گلشن اقبال", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Ali Raza", NameUrdu: "علی رضا", Phone: "03001234567", CNIC: "42201-7654321-1", Address: "Flat #4, Block B, North Nazimabad", AddressUrdu: "فلیٹ 4، بلاک بی، نارتھ ناظم آباد", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Ahmed Khan", NameUrdu: "احمد خان", Phone: "03331234567", CNIC: "42201-9876543-1", Address: "Shop #8, Saddar Market", AddressUrdu: "دوکان 8، صدر مارکیٹ", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Bilal Siddique", NameUrdu: "بل wake صدیقی", Phone: "03451234567", CNIC: "42201-3456789-1", Address: "23-A, Model Colony", AddressUrdu: "23-A، ماڈل کالونی", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Saad Butt", NameUrdu: "سعد بٹ", Phone: "03211234567", CNIC: "42201-2345678-1", Address: "House #45, Green Town", AddressUrdu: "گھر 45، گرین ٹاؤن", CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}
	for _, c := range customers {
		var existing domain.Customer
		if coll.FindOne(ctx, bson.M{"phone": c.Phone}).Decode(&existing) == nil {
			log.Printf("ℹ️  Customer %s already exists", c.Name)
			continue
		}
		coll.InsertOne(ctx, c)
		log.Printf("✅ Customer: %s (%s)", c.Name, c.Phone)
	}
	return customers
}

// ========== GUARANTORS (2 per customer) ==========
func seedGuarantors(ctx context.Context, customers []domain.Customer) {
	coll := config.DB.Collection("guarantors")
	custColl := config.DB.Collection("customers")

	guarantorData := [][]struct {
		Name    string
		NameUrdu string
		Phone   string
		CNIC    string
		Relation string
	}{
		{ // Customer 1
			{Name: "Owais Ahmed", NameUrdu: "اویس احمد", Phone: "03019876543", CNIC: "42201-1111111-1", Relation: "Brother"},
			{Name: "Tariq Mehmood", NameUrdu: "طارق محمود", Phone: "03019876544", CNIC: "42201-2222222-1", Relation: "Uncle"},
		},
		{ // Customer 2
			{Name: "Zain Ul Abideen", NameUrdu: "زین العابدین", Phone: "03121234567", CNIC: "42201-3333333-1", Relation: "Friend"},
			{Name: "Rashid Ali", NameUrdu: "راشد علی", Phone: "03121234568", CNIC: "42201-4444444-1", Relation: "Cousin"},
		},
		{ // Customer 3
			{Name: "Faisal Qureshi", NameUrdu: "فیصل قریشی", Phone: "03331234568", CNIC: "42201-5555555-1", Relation: "Brother"},
			{Name: "Naeem Akhtar", NameUrdu: "نعیم اختر", Phone: "03331234569", CNIC: "42201-6666666-1", Relation: "Friend"},
		},
		{ // Customer 4
			{Name: "Shahid Iqbal", NameUrdu: "شاہد اقبال", Phone: "03451234568", CNIC: "42201-7777777-1", Relation: "Brother"},
			{Name: "Kamran Haider", NameUrdu: "کامران حیدر", Phone: "03451234569", CNIC: "42201-8888888-1", Relation: "Uncle"},
		},
		{ // Customer 5
			{Name: "Umer Farooq", NameUrdu: "عمر فاروق", Phone: "03211234568", CNIC: "42201-9999999-1", Relation: "Cousin"},
			{Name: "Hassan Raza", NameUrdu: "حسن رضا", Phone: "03211234569", CNIC: "42201-1010101-1", Relation: "Friend"},
		},
	}

	for i, cust := range customers {
		custObjID, _ := primitive.ObjectIDFromHex(cust.ID.Hex())
		for _, g := range guarantorData[i] {
			var existing domain.Guarantor
			if coll.FindOne(ctx, bson.M{"phone": g.Phone}).Decode(&existing) == nil {
				continue
			}
			guarantor := domain.Guarantor{
				ID:                 primitive.NewObjectID(),
				CustomerID:         custObjID,
				Name:               g.Name,
				NameUrdu:           g.NameUrdu,
				Phone:              g.Phone,
				CNIC:               g.CNIC,
				RelationToCustomer: g.Relation,
				VerificationStatus: "verified",
				CreatedAt:          time.Now(),
				UpdatedAt:          time.Now(),
			}
			coll.InsertOne(ctx, guarantor)

			// Add to customer's GuarantorIDs
			cust.GuarantorIDs = append(cust.GuarantorIDs, guarantor.ID)
			log.Printf("✅ Guarantor: %s → %s", g.Name, cust.Name)
		}
		// Update customer with guarantor IDs
		cust.UpdatedAt = time.Now()
		custColl.ReplaceOne(ctx, bson.M{"_id": custObjID}, cust)
	}
}

// ========== PRODUCTS ==========
func seedProducts(ctx context.Context) []domain.Product {
	coll := config.DB.Collection("products")
	products := []domain.Product{
		{ID: primitive.NewObjectID(), Name: "Honda CD 70", NameUrdu: "ہونڈا سی ڈی 70", Category: "Vehicle", Price: 157000, PurchasePrice: 140000, Description: "Brand new bike 2024 model", InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Samsung Fridge", NameUrdu: "سام سنگ فرج", Category: "Home Appliance", Price: 85000, PurchasePrice: 75000, Description: "Frost free double door", InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "iPhone 15", NameUrdu: "آئی فون 15", Category: "Electronics", Price: 340000, PurchasePrice: 310000, Description: "128GB Black", InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Samsung AC 1.5 Ton", NameUrdu: "سام سنگ اے سی 1.5 ٹن", Category: "Electronics", Price: 120000, PurchasePrice: 105000, Description: "Inverter AC", InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Washing Machine", NameUrdu: "واشنگ مشین", Category: "Home Appliance", Price: 55000, PurchasePrice: 48000, Description: "Fully automatic 7kg", InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Deep Freezer", NameUrdu: "ڈیپ فریزر", Category: "Home Appliance", Price: 70000, PurchasePrice: 62000, Description: "400L chest freezer", InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "LCD 55 inch", NameUrdu: "ایل سی ڈی 55 انچ", Category: "Electronics", Price: 95000, PurchasePrice: 82000, Description: "Smart LED 4K", InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Juicer Machine", NameUrdu: "جوسر مشین", Category: "Home Appliance", Price: 8000, PurchasePrice: 6000, Description: "1000W with 3 jars", InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Iron", NameUrdu: "استری", Category: "Home Appliance", Price: 3000, PurchasePrice: 2200, Description: "Steam iron non-stick", InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: primitive.NewObjectID(), Name: "Geezer", NameUrdu: "گیزر", Category: "Home Appliance", Price: 22000, PurchasePrice: 18000, Description: "Gas geyser 30 gallon", InStock: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}
	for _, p := range products {
		var existing domain.Product
		if coll.FindOne(ctx, bson.M{"name": p.Name}).Decode(&existing) == nil {
			log.Printf("ℹ️  Product %s already exists", p.Name)
			continue
		}
		coll.InsertOne(ctx, p)
		log.Printf("✅ Product: %s (Rs. %d)", p.Name, int(p.Price))
	}
	return products
}

// ========== INVENTORY ==========
func seedInventory(ctx context.Context, products []domain.Product) {
	coll := config.DB.Collection("inventory")
	for _, p := range products {
		for j := 0; j < 3; j++ {
			item := domain.InventoryItem{
				ID:            primitive.NewObjectID(),
				ProductID:     p.ID,
				SerialNumber:  fmt.Sprintf("SN-%s-%d", p.ID.Hex()[:6], j+1),
				PurchasePrice: p.PurchasePrice,
				Status:        "in_stock",
				Company:       p.Name,
				Color:         "Black",
				PurchaseDate:  time.Now().AddDate(0, -1, 0),
				CreatedAt:     time.Now(),
				UpdatedAt:     time.Now(),
			}
			coll.InsertOne(ctx, item)
		}
		log.Printf("✅ Inventory: 3 items for %s", p.Name)
	}
}

// ========== INSTALLMENT PLANS ==========
func seedInstallmentPlans(ctx context.Context, customers []domain.Customer, products []domain.Product) []domain.InstallmentPlan {
	coll := config.DB.Collection("installments")
	
	plansData := []struct {
		custIdx  int
		prodIdx  int
		total    float64
		down     float64
		months   int
		grace    int
		fine     float64
		serial   string
		imei     string
		engine   string
		chassis  string
		model    string
		color    string
		company  string
	}{
		{custIdx: 0, prodIdx: 0, total: 160000, down: 20000, months: 10, grace: 2, fine: 50, serial: "CD70-2024-001", engine: "ENG-1234", chassis: "CHS-5678", model: "2024", color: "Black", company: "Honda"},
		{custIdx: 1, prodIdx: 2, total: 350000, down: 50000, months: 12, grace: 3, fine: 100, serial: "IP15-128GB-001", imei: "123456789012345", model: "15", color: "Midnight", company: "Apple"},
		{custIdx: 2, prodIdx: 1, total: 90000, down: 10000, months: 6, grace: 2, fine: 30, serial: "FRIDGE-2024-001", model: "RT42", color: "Silver", company: "Samsung"},
	}

	var plans []domain.InstallmentPlan
	invColl := config.DB.Collection("inventory")

	for _, pd := range plansData {
		cust := customers[pd.custIdx]
		prod := products[pd.prodIdx]

		// Get inventory item
		var invItem domain.InventoryItem
		if err := invColl.FindOne(ctx, bson.M{"product_id": prod.ID, "status": "in_stock"}).Decode(&invItem); err == nil {
			invItem.Status = "sold"
			now := time.Now()
			invItem.SoldDate = &now
			invColl.ReplaceOne(ctx, bson.M{"_id": invItem.ID}, invItem)
		}

		start := time.Now()
		plan := domain.InstallmentPlan{
			ID:                   primitive.NewObjectID(),
			CustomerID:           cust.ID,
			ProductID:            prod.ID,
			InventoryItemID:      invItem.ID,
			TotalAmount:          pd.total,
			DownPayment:          pd.down,
			RemainingAmount:      pd.total - pd.down,
			NumberOfInstallments: pd.months,
			InstallmentAmount:    math.Round(((pd.total-pd.down)/float64(pd.months))*100) / 100,
			StartDate:            start,
			EndDate:              start.AddDate(0, pd.months, 0),
			GracePeriodDays:      pd.grace,
			FinePerDay:           pd.fine,
			Status:               "active",
			SerialNumber:         pd.serial,
			IMEI:                 pd.imei,
			EngineNo:             pd.engine,
			ChassisNo:            pd.chassis,
			Model:                pd.model,
			Color:                pd.color,
			Company:              pd.company,
			CreatedAt:            time.Now(),
			UpdatedAt:            time.Now(),
		}

		// Generate schedule
		amt := plan.InstallmentAmount
		for i := 1; i <= pd.months; i++ {
			due := start.AddDate(0, i, 0)
			plan.Installments = append(plan.Installments, domain.InstallmentDetail{
				InstallmentNo: i,
				DueDate:       due,
				Amount:        amt,
				Paid:          false,
				Remaining:     amt,
			})
		}

		coll.InsertOne(ctx, plan)
		plans = append(plans, plan)
		log.Printf("✅ Plan: %s → %s (Rs. %.0f, %d months)", cust.Name, prod.Name, pd.total, pd.months)
	}

	return plans
}

// ========== PAYMENTS ==========
func seedPayments(ctx context.Context, plans []domain.InstallmentPlan) {
	payColl := config.DB.Collection("payments")
	planColl := config.DB.Collection("installments")
	accColl := config.DB.Collection("accounting")

	for _, plan := range plans {
		// Pay first 2 installments
		for i := 0; i < 2 && i < len(plan.Installments); i++ {
			inst := &plan.Installments[i]
			now := time.Now()
			inst.Paid = true
			inst.PaidDate = &now
			inst.Remaining = 0

			payment := domain.Payment{
				ID:                primitive.NewObjectID(),
				InstallmentPlanID: plan.ID,
				InstallmentNo:     inst.InstallmentNo,
				Amount:            inst.Amount,
				Method:            "cash",
				TransactionDate:   now,
			}
			payColl.InsertOne(ctx, payment)

			// Accounting entry
			acc := domain.AccountingEntry{
				ID:            primitive.NewObjectID(),
				Type:          "income",
				Basis:         "cash_flow",
				Amount:        inst.Amount,
				Description:   "Installment payment",
				RelatedPlanID: &plan.ID,
				Date:          now,
			}
			accColl.InsertOne(ctx, acc)

			log.Printf("✅ Payment: Plan %s, Installment %d → Rs. %.0f", plan.ID.Hex()[:8], inst.InstallmentNo, inst.Amount)
		}
		// Update plan with paid installments
		planColl.ReplaceOne(ctx, bson.M{"_id": plan.ID}, plan)
	}
}
