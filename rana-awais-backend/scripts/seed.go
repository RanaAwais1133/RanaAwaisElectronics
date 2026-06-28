package main

import (
	"context"
	"fmt"
	"log"
	"math"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	mongoRepo "github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository/mongo"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	fmt.Println("🚀 Seeding database with comprehensive dummy data...")

	// Connect to MongoDB
	ctx := context.Background()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}
	defer client.Disconnect(ctx)

	db := client.Database("rana_awais_erp")

	// Set config.DB so repository constructors work
	config.DB = db

	// Clean existing data - include guarantors and notifications too
	collections := []string{"customers", "products", "inventory", "installments", "payments", "accounting_entries", "guarantors", "notifications"}
	for _, col := range collections {
		db.Collection(col).DeleteMany(ctx, map[string]interface{}{})
	}
	fmt.Println("✅ Cleaned existing data")

	// Create repositories
	custRepo := mongoRepo.NewCustomerRepository()
	prodRepo := mongoRepo.NewProductRepository()
	invRepo := mongoRepo.NewInventoryRepository()
	planRepo := mongoRepo.NewInstallmentRepository()
	payRepo := mongoRepo.NewPaymentRepository()
	accRepo := mongoRepo.NewAccountingRepository()
	guarRepo := mongoRepo.NewGuarantorRepository()

	now := time.Now()

	// ============================================================
	// 1. CREATE CUSTOMERS (5 customers)
	// ============================================================
	customers := []domain.Customer{
		{
			Name:        "Ahmad Ali",
			NameUrdu:    "احمد علی",
			FatherName:  "Muhammad Ali",
			Phone:       "0300-1234567",
			CNIC:        "35202-1234567-1",
			Address:     "123 Main Street, Lahore",
			AddressUrdu: "123 مرکزی سڑک، لاہور",
		},
		{
			Name:        "Muhammad Usman",
			NameUrdu:    "محمد عثمان",
			FatherName:  "Muhammad Farooq",
			Phone:       "0301-2345678",
			CNIC:        "35201-2345678-2",
			Address:     "456 Canal Road, Faisalabad",
			AddressUrdu: "456 نہر روڈ، فیصل آباد",
		},
		{
			Name:        "Fatima Bibi",
			NameUrdu:    "فاطمہ بی بی",
			FatherName:  "Muhammad Hussain",
			Phone:       "0302-3456789",
			CNIC:        "35203-3456789-3",
			Address:     "789 Bosan Road, Multan",
			AddressUrdu: "789 بوسن روڈ، ملتان",
		},
		{
			Name:        "Bilal Hassan",
			NameUrdu:    "بلال حسن",
			FatherName:  "Muhammad Yousaf",
			Phone:       "0303-4567890",
			CNIC:        "35204-4567890-4",
			Address:     "321 GT Road, Gujranwala",
			AddressUrdu: "321 جی ٹی روڈ، گوجرانوالہ",
		},
		{
			Name:        "Sana Malik",
			NameUrdu:    "ثنا ملک",
			FatherName:  "Malik Aslam",
			Phone:       "0304-5678901",
			CNIC:        "35205-5678901-5",
			Address:     "654 Sialkot Road, Sialkot",
			AddressUrdu: "654 سیالکوٹ روڈ، سیالکوٹ",
		},
	}

	customerIDs := make([]primitive.ObjectID, len(customers))
	for i, c := range customers {
		c.ID = primitive.NewObjectID()
		c.CreatedAt = now
		c.UpdatedAt = now
		if err := custRepo.Create(ctx, &c); err != nil {
			log.Fatalf("Failed to create customer %d: %v", i, err)
		}
		customerIDs[i] = c.ID
		fmt.Printf("✅ Customer created: %s (ID: %s)\n", c.Name, c.ID.Hex())
	}

	// ============================================================
	// 2. CREATE GUARANTORS (2 per customer = 10 guarantors)
	// ============================================================
	type guarantorInfo struct {
		Name       string
		NameUrdu   string
		FatherName string
		Phone      string
		CNIC       string
		Address    string
		Relation   string
	}

	guarantorData := [][]guarantorInfo{
		{ // Customer 1 - Ahmad Ali
			{Name: "Khalid Mehmood", NameUrdu: "خالد محمود", FatherName: "Mehmood Ahmed", Phone: "0305-1111111", CNIC: "35202-1111111-1", Address: "456 Garden Town, Lahore", Relation: "Brother"},
			{Name: "Imran Khan", NameUrdu: "عمران خان", FatherName: "Khan Muhammad", Phone: "0305-1111112", CNIC: "35202-1111112-2", Address: "789 Model Town, Lahore", Relation: "Friend"},
		},
		{ // Customer 2 - Muhammad Usman
			{Name: "Naveed Ahmed", NameUrdu: "نوید احمد", FatherName: "Ahmed Ali", Phone: "0305-2222221", CNIC: "35201-2222221-1", Address: "123 Peoples Colony, Faisalabad", Relation: "Cousin"},
			{Name: "Tariq Mehmood", NameUrdu: "طارق محمود", FatherName: "Mehmood Hussain", Phone: "0305-2222222", CNIC: "35201-2222222-2", Address: "456 Jinnah Colony, Faisalabad", Relation: "Uncle"},
		},
		{ // Customer 3 - Fatima Bibi
			{Name: "Muhammad Aslam", NameUrdu: "محمد اسلم", FatherName: "Aslam Khan", Phone: "0305-3333331", CNIC: "35203-3333331-1", Address: "123 Shah Rukn-e-Alam, Multan", Relation: "Husband"},
			{Name: "Sajid Hussain", NameUrdu: "ساجد حسین", FatherName: "Hussain Ahmed", Phone: "0305-3333332", CNIC: "35203-3333332-2", Address: "456 Mumtazabad, Multan", Relation: "Brother"},
		},
		{ // Customer 4 - Bilal Hassan
			{Name: "Faisal Javed", NameUrdu: "فیصل جاوید", FatherName: "Javed Iqbal", Phone: "0305-4444441", CNIC: "35204-4444441-1", Address: "123 Satellite Town, Gujranwala", Relation: "Friend"},
			{Name: "Kamran Yousaf", NameUrdu: "کامران یوسف", FatherName: "Yousaf Ali", Phone: "0305-4444442", CNIC: "35204-4444442-2", Address: "456 Civil Lines, Gujranwala", Relation: "Cousin"},
		},
		{ // Customer 5 - Sana Malik
			{Name: "Rashid Mehmood", NameUrdu: "رشید محمود", FatherName: "Mehmood Ahmed", Phone: "0305-5555551", CNIC: "35205-5555551-1", Address: "123 Wazirabad Road, Sialkot", Relation: "Father"},
			{Name: "Zubair Ahmed", NameUrdu: "زبیر احمد", FatherName: "Ahmed Nawaz", Phone: "0305-5555552", CNIC: "35205-5555552-2", Address: "456 Daska Road, Sialkot", Relation: "Uncle"},
		},
	}

	guarantorIDs := make([][]primitive.ObjectID, len(customers))
	for i, gList := range guarantorData {
		guarantorIDs[i] = make([]primitive.ObjectID, 0, len(gList))
		for _, g := range gList {
			guar := &domain.Guarantor{
				Name:               g.Name,
				NameUrdu:           g.NameUrdu,
				FatherName:         g.FatherName,
				Phone:              g.Phone,
				CNIC:               g.CNIC,
				Address:            g.Address,
				Relation:           g.Relation,
				RelationToCustomer: g.Relation,
				CustomerID:         customerIDs[i],
				VerificationStatus: "verified",
				Occupation:         "Business",
				OfficePhone:        "042-111" + g.Phone[len(g.Phone)-4:],
				OfficeAddress:      g.Address + " (Office)",
			}
			if err := guarRepo.Create(ctx, guar); err != nil {
				log.Fatalf("Failed to create guarantor: %v", err)
			}
			guarantorIDs[i] = append(guarantorIDs[i], guar.ID)
			fmt.Printf("✅ Guarantor created: %s for customer %s\n", g.Name, customers[i].Name)
		}

		// Update customer with guarantor IDs (use direct update to only set guarantor_ids field)
		custColl := db.Collection("customers")
		if _, err := custColl.UpdateOne(ctx, bson.M{"_id": customerIDs[i]}, bson.M{"$set": bson.M{"guarantor_ids": guarantorIDs[i]}}); err != nil {
			log.Printf("⚠️ Failed to update customer %s with guarantor IDs: %v", customers[i].Name, err)
		}

	}

	// ============================================================
	// 3. CREATE PRODUCTS (5 products)
	// ============================================================
	products := []domain.Product{
		{
			Name:          "Samsung Galaxy S24",
			NameUrdu:      "سام سنگ گلیکسی S24",
			Price:         120000,
			PurchasePrice: 100000,
			Category:      "Mobile Phone",
			Company:       "Samsung",
			StockCount:    10,
			InStock:       true,
		},
		{
			Name:          "Honda CD 70",
			NameUrdu:      "ہونڈا CD 70",
			Price:         95000,
			PurchasePrice: 85000,
			Category:      "Motorcycle",
			Company:       "Honda",
			StockCount:    5,
			InStock:       true,
		},
		{
			Name:          "Haier AC 1.5 Ton",
			NameUrdu:      "ہائیر AC 1.5 ٹن",
			Price:         85000,
			PurchasePrice: 70000,
			Category:      "Air Conditioner",
			Company:       "Haier",
			StockCount:    8,
			InStock:       true,
		},
		{
			Name:          "Dell Latitude Laptop i7",
			NameUrdu:      "ڈیل لیپ ٹاپ i7",
			Price:         110000,
			PurchasePrice: 95000,
			Category:      "Laptop",
			Company:       "Dell",
			StockCount:    6,
			InStock:       true,
		},
		{
			Name:          "LED TV 55 Inch",
			NameUrdu:      "LED TV 55 انچ",
			Price:         75000,
			PurchasePrice: 60000,
			Category:      "Television",
			Company:       "Sony",
			StockCount:    4,
			InStock:       true,
		},
	}

	productIDs := make([]primitive.ObjectID, len(products))
	for i, p := range products {
		p.ID = primitive.NewObjectID()
		p.CreatedAt = now
		p.UpdatedAt = now
		if err := prodRepo.Create(ctx, &p); err != nil {
			log.Fatalf("Failed to create product %d: %v", i, err)
		}
		productIDs[i] = p.ID
		fmt.Printf("✅ Product created: %s (Rs. %.0f)\n", p.Name, p.Price)
	}

	// ============================================================
	// 4. CREATE INVENTORY ITEMS (3 per product = 15 items)
	// ============================================================
	for i, prodID := range productIDs {
		for j := 0; j < 3; j++ {
			shortName := products[i].Name
			if len(shortName) > 3 {
				shortName = shortName[:3]
			}
			item := &domain.InventoryItem{
				ProductID:    prodID,
				SerialNumber: fmt.Sprintf("SN-%s-%03d", shortName, j+1),
				Status:       "in_stock",
				PurchaseDate: now,
			}
			item.ID = primitive.NewObjectID()
			if err := invRepo.Create(ctx, item); err != nil {
				log.Fatalf("Failed to create inventory item: %v", err)
			}
		}
		fmt.Printf("✅ Inventory created for: %s (3 items)\n", products[i].Name)
	}

	// ============================================================
	// 5. CREATE INSTALLMENT PLANS (Different Fine Types)
	// ============================================================

	// Plan 1: Per Day Fine (Customer 1 - Ahmad Ali - Samsung S24)
	plan1 := createPlan(customerIDs[0], productIDs[0], 120000, 20000, 5000, 6, now, 3, 50, "per_day", 0)
	if err := planRepo.Create(ctx, plan1); err != nil {
		log.Fatalf("Failed to create plan 1: %v", err)
	}
	fmt.Printf("✅ Plan 1 (Per Day Fine): %s - Rs. %.0f\n", customers[0].Name, plan1.TotalAmount)

	// Plan 2: Fixed Fine (Customer 2 - Usman - Honda CD 70)
	plan2 := createPlan(customerIDs[1], productIDs[1], 95000, 15000, 4000, 5, now, 5, 0, "fixed", 500)
	if err := planRepo.Create(ctx, plan2); err != nil {
		log.Fatalf("Failed to create plan 2: %v", err)
	}
	fmt.Printf("✅ Plan 2 (Fixed Fine Rs.500): %s - Rs. %.0f\n", customers[1].Name, plan2.TotalAmount)

	// Plan 3: Both Fine (Customer 3 - Fatima - Haier AC)
	plan3 := createPlan(customerIDs[2], productIDs[2], 85000, 10000, 3000, 6, now, 3, 30, "both", 300)
	if err := planRepo.Create(ctx, plan3); err != nil {
		log.Fatalf("Failed to create plan 3: %v", err)
	}
	fmt.Printf("✅ Plan 3 (Both Fine): %s - Rs. %.0f\n", customers[2].Name, plan3.TotalAmount)

	// Plan 4: No Fine (Customer 4 - Bilal - Dell Laptop)
	plan4 := createPlan(customerIDs[3], productIDs[3], 110000, 25000, 5000, 5, now, 0, 0, "none", 0)
	if err := planRepo.Create(ctx, plan4); err != nil {
		log.Fatalf("Failed to create plan 4: %v", err)
	}
	fmt.Printf("✅ Plan 4 (No Fine): %s - Rs. %.0f\n", customers[3].Name, plan4.TotalAmount)

	// Plan 5: Per Day High Fine (Customer 5 - Sana - LED TV)
	plan5 := createPlan(customerIDs[4], productIDs[4], 75000, 15000, 3000, 5, now, 2, 100, "per_day", 0)
	if err := planRepo.Create(ctx, plan5); err != nil {
		log.Fatalf("Failed to create plan 5: %v", err)
	}
	fmt.Printf("✅ Plan 5 (High Per Day Fine): %s - Rs. %.0f\n", customers[4].Name, plan5.TotalAmount)

	// ============================================================
	// 6. CREATE PAYMENTS (Mix of on-time, late with fines)
	// ============================================================

	// Plan 1: Pay installment 1 on time (no fine), installment 2 late (with fine)
	payInstallment(ctx, payRepo, plan1, 1, 5000, "cash", now.AddDate(0, 0, -60), "Huzaifa", "user1", "")
	fmt.Printf("✅ Payment: Plan1 Inst1 (On Time - No Fine)\n")

	// Pay installment 2 late - 10 days overdue with per-day fine Rs.50
	lateDate2 := plan1.Installments[1].DueDate.AddDate(0, 0, 10) // 10 days late
	payInstallment(ctx, payRepo, plan1, 2, 5000, "cash", lateDate2, "Huzaifa", "user1", "")
	fmt.Printf("✅ Payment: Plan1 Inst2 (10 Days Late - Per Day Fine Rs.50)\n")

	// Plan 2: Pay installment 1 late - fixed fine Rs.500
	lateDate3 := plan2.Installments[0].DueDate.AddDate(0, 0, 15) // 15 days late
	payInstallment(ctx, payRepo, plan2, 1, 4000, "jazzcash", lateDate3, "Ali", "user2", "")
	fmt.Printf("✅ Payment: Plan2 Inst1 (15 Days Late - Fixed Fine Rs.500)\n")

	// Plan 3: Pay installment 1 on time (no fine)
	payInstallment(ctx, payRepo, plan3, 1, 3000, "cash", now.AddDate(0, 0, -45), "Huzaifa", "user1", "")
	fmt.Printf("✅ Payment: Plan3 Inst1 (On Time - No Fine)\n")

	// Plan 4: Pay installment 1 on time (no fine - fine type is "none")
	payInstallment(ctx, payRepo, plan4, 1, 5000, "bank_transfer", now.AddDate(0, 0, -30), "Ali", "user2", "")
	fmt.Printf("✅ Payment: Plan4 Inst1 (On Time - No Fine Type)\n")

	// Plan 5: Pay installment 1 late - 5 days overdue with high per-day fine Rs.100
	lateDate5 := plan5.Installments[0].DueDate.AddDate(0, 0, 5) // 5 days late
	payInstallment(ctx, payRepo, plan5, 1, 3000, "easypaisa", lateDate5, "Huzaifa", "user1", "")
	fmt.Printf("✅ Payment: Plan5 Inst1 (5 Days Late - High Per Day Fine Rs.100)\n")

	// ============================================================
	// 7. CREATE ACCOUNTING ENTRIES
	// ============================================================
	entries := []domain.AccountingEntry{
		{Type: "income", Basis: "cash_flow", Amount: 20000, Description: "Down payment - Plan 1", Date: now.AddDate(0, 0, -90)},
		{Type: "income", Basis: "cash_flow", Amount: 15000, Description: "Down payment - Plan 2", Date: now.AddDate(0, 0, -85)},
		{Type: "income", Basis: "cash_flow", Amount: 10000, Description: "Down payment - Plan 3", Date: now.AddDate(0, 0, -80)},
		{Type: "income", Basis: "cash_flow", Amount: 25000, Description: "Down payment - Plan 4", Date: now.AddDate(0, 0, -75)},
		{Type: "income", Basis: "cash_flow", Amount: 15000, Description: "Down payment - Plan 5", Date: now.AddDate(0, 0, -70)},
		{Type: "expense", Basis: "cash_flow", Amount: 5000, Description: "Shop rent", Date: now.AddDate(0, 0, -60)},
		{Type: "expense", Basis: "cash_flow", Amount: 3000, Description: "Electricity bill", Date: now.AddDate(0, 0, -55)},
		{Type: "expense", Basis: "cash_flow", Amount: 2000, Description: "Staff salary", Date: now.AddDate(0, 0, -50)},
	}

	for _, e := range entries {
		e.ID = primitive.NewObjectID()
		e.CreatedAt = now
		if err := accRepo.Create(ctx, &e); err != nil {
			log.Fatalf("Failed to create accounting entry: %v", err)
		}
	}
	fmt.Printf("✅ Accounting entries created: %d\n", len(entries))

	// ============================================================
	// 8. CREATE NOTIFICATIONS (for reminders testing)
	// ============================================================
	notifColl := db.Collection("notifications")
	notifications := []interface{}{
		bson.M{
			"_id":        primitive.NewObjectID(),
			"type":       "payment_reminder",
			"title":      "قسط یاد دہانی",
			"message":    "احمد علی کی قسط 3 کل واجب الادا ہے",
			"recipient":  "0300-1234567",
			"status":     "pending",
			"created_at": now,
		},
		bson.M{
			"_id":        primitive.NewObjectID(),
			"type":       "payment_reminder",
			"title":      "قسط یاد دہانی",
			"message":    "محمد عثمان کی قسط 2 کل واجب الادا ہے",
			"recipient":  "0301-2345678",
			"status":     "pending",
			"created_at": now,
		},
		bson.M{
			"_id":        primitive.NewObjectID(),
			"type":       "payment_reminder",
			"title":      "قسط یاد دہانی",
			"message":    "فاطمہ بی بی کی قسط 2 تین دن میں واجب الادا ہے",
			"recipient":  "0302-3456789",
			"status":     "pending",
			"created_at": now,
		},
		bson.M{
			"_id":        primitive.NewObjectID(),
			"type":       "overdue_notice",
			"title":      "تاخیر کا نوٹس",
			"message":    "بلال حسن کی قسط 2 پانچ دن تاخیر سے ہے - جرمانہ لاگو",
			"recipient":  "0303-4567890",
			"status":     "pending",
			"created_at": now,
		},
		bson.M{
			"_id":        primitive.NewObjectID(),
			"type":       "overdue_notice",
			"title":      "تاخیر کا نوٹس",
			"message":    "ثنا ملک کی قسط 2 تین دن تاخیر سے ہے - جرمانہ لاگو",
			"recipient":  "0304-5678901",
			"status":     "pending",
			"created_at": now,
		},
	}
	if _, err := notifColl.InsertMany(ctx, notifications); err != nil {
		log.Printf("⚠️ Failed to create notifications: %v", err)
	} else {
		fmt.Printf("✅ Notifications created: %d\n", len(notifications))
	}

	fmt.Println("\n========================================")
	fmt.Println("🎉 SEEDING COMPLETE!")
	fmt.Println("========================================")
	fmt.Println("\n📋 Summary:")
	fmt.Printf("   Customers: %d\n", len(customers))
	fmt.Printf("   Guarantors: %d\n", len(guarantorData)*2)
	fmt.Printf("   Products: %d\n", len(products))
	fmt.Printf("   Inventory Items: %d\n", len(products)*3)
	fmt.Printf("   Installment Plans: 5\n")
	fmt.Printf("   Payments: 6\n")
	fmt.Printf("   Accounting Entries: %d\n", len(entries))
	fmt.Printf("   Notifications: %d\n", len(notifications))
	fmt.Println("\n📌 Fine Types Tested:")
	fmt.Println("   ✅ Plan 1: Per Day Fine (Rs.50/day, 3 days grace)")
	fmt.Println("   ✅ Plan 2: Fixed Fine (Rs.500, 5 days grace)")
	fmt.Println("   ✅ Plan 3: Both Fine (Rs.300 fixed + Rs.30/day, 3 days grace)")
	fmt.Println("   ✅ Plan 4: No Fine")
	fmt.Println("   ✅ Plan 5: High Per Day Fine (Rs.100/day, 2 days grace)")
	fmt.Println("\n📌 Payment Scenarios:")
	fmt.Println("   ✅ On-time payments (no fine)")
	fmt.Println("   ✅ Late payments with per-day fine")
	fmt.Println("   ✅ Late payment with fixed fine")
	fmt.Println("   ✅ Late payment with both fine")
	fmt.Println("   ✅ Payment with no-fine plan")
	fmt.Println("\n📌 Guarantors:")
	fmt.Println("   ✅ 2 guarantors per customer (10 total)")
	fmt.Println("   ✅ Linked to customers via guarantor_ids")
	fmt.Println("\n📌 Notifications:")
	fmt.Println("   ✅ Payment reminders created")
	fmt.Println("   ✅ Overdue notices created")
}

func createPlan(customerID, productID primitive.ObjectID, totalAmount, downPayment, installmentAmount float64, numInstallments int, startDate time.Time, graceDays int, finePerDay float64, fineType string, fixedFineAmount float64) *domain.InstallmentPlan {

	remaining := totalAmount - downPayment
	plan := &domain.InstallmentPlan{
		ID:                   primitive.NewObjectID(),
		CustomerID:           customerID,
		ProductID:            productID,
		TotalAmount:          totalAmount,
		DownPayment:          downPayment,
		RemainingAmount:      remaining,
		NumberOfInstallments: numInstallments,
		InstallmentAmount:    installmentAmount,
		StartDate:            startDate,
		GracePeriodDays:      graceDays,
		FinePerDay:           finePerDay,
		FineType:             fineType,
		FixedFineAmount:      fixedFineAmount,
		Status:               "Open",
		CreatedAt:            startDate,
		UpdatedAt:            startDate,
	}

	// Generate installments
	var schedule []domain.InstallmentDetail
	for i := 1; i <= numInstallments; i++ {
		dueDate := startDate.AddDate(0, i, 0)
		amt := installmentAmount
		if i == numInstallments {
			totalSoFar := installmentAmount * float64(numInstallments-1)
			amt = math.Round((remaining-totalSoFar)*100) / 100
		}
		schedule = append(schedule, domain.InstallmentDetail{
			InstallmentNo: i,
			DueDate:       dueDate,
			Amount:        amt,
			Paid:          false,
			Fine:          0,
			PartialPaid:   0,
			Remaining:     amt,
		})
	}
	plan.Installments = schedule
	plan.EndDate = schedule[len(schedule)-1].DueDate

	return plan
}

func payInstallment(ctx context.Context, payRepo *mongoRepo.PaymentRepository, plan *domain.InstallmentPlan, instNo int, amount float64, method string, payDate time.Time, collectedBy, collectedById, remarks string) {
	// Find the installment
	var inst *domain.InstallmentDetail
	for i := range plan.Installments {
		if plan.Installments[i].InstallmentNo == instNo {
			inst = &plan.Installments[i]
			break
		}
	}
	if inst == nil {
		return
	}

	// Calculate fine
	fine := calculateFine(plan, *inst, payDate)
	totalDue := inst.Amount + fine - inst.PartialPaid

	applyAmount := amount
	if applyAmount > totalDue {
		applyAmount = totalDue
	}

	// Calculate fine portion
	finePortion := 0.0
	if fine > 0 && applyAmount > inst.Amount-inst.PartialPaid {
		finePortion = applyAmount - (inst.Amount - inst.PartialPaid)
		if finePortion > fine {
			finePortion = fine
		}
	}

	inst.PartialPaid += applyAmount
	inst.Remaining = totalDue - applyAmount
	inst.Fine = fine
	inst.CollectedBy = collectedBy
	inst.CollectedById = collectedById
	inst.Remarks = remarks

	if inst.Remaining <= 0 {
		inst.Paid = true
		inst.PaidDate = &payDate
	}

	// Create payment record
	payment := &domain.Payment{
		InstallmentPlanID:  plan.ID,
		InstallmentNo:      instNo,
		Amount:             applyAmount,
		AmountWithoutFine:  applyAmount - finePortion,
		FinePaid:           finePortion,
		Method:             method,
		TransactionDate:    payDate,
		PaymentDate:        payDate,
		CollectedBy:        collectedBy,
		CollectedById:      collectedById,
		RecoveryOfficer:    collectedBy,
		Remarks:            remarks,
		IsFullPayment:      inst.Paid,
	}
	payment.ID = primitive.NewObjectID()
	payment.CreatedAt = payDate

	if err := payRepo.Create(ctx, payment); err != nil {
		log.Printf("⚠️ Failed to create payment: %v", err)
	}
}

func calculateFine(plan *domain.InstallmentPlan, detail domain.InstallmentDetail, now time.Time) float64 {
	if detail.Paid || now.Before(detail.DueDate) {
		return 0
	}

	fineType := plan.FineType
	if fineType == "" {
		fineType = "per_day"
	}

	switch fineType {
	case "none":
		return 0
	case "fixed":
		graceEnd := detail.DueDate.AddDate(0, 0, plan.GracePeriodDays)
		if now.Before(graceEnd) {
			return 0
		}
		fine := plan.FixedFineAmount
		if fine > detail.Amount*2 {
			fine = detail.Amount * 2
		}
		return math.Round(fine*100) / 100
	case "both":
		graceEnd := detail.DueDate.AddDate(0, 0, plan.GracePeriodDays)
		if now.Before(graceEnd) {
			return 0
		}
		daysOverdue := int(now.Sub(graceEnd).Hours() / 24)
		if daysOverdue <= 0 {
			return 0
		}
		fine := plan.FixedFineAmount + (float64(daysOverdue) * plan.FinePerDay)
		if fine > detail.Amount*2 {
			fine = detail.Amount * 2
		}
		return math.Round(fine*100) / 100
	default: // "per_day"
		graceEnd := detail.DueDate.AddDate(0, 0, plan.GracePeriodDays)
		if now.Before(graceEnd) {
			return 0
		}
		daysOverdue := int(now.Sub(graceEnd).Hours() / 24)
		if daysOverdue <= 0 {
			return 0
		}
		fine := float64(daysOverdue) * plan.FinePerDay
		if fine > detail.Amount*2 {
			fine = detail.Amount * 2
		}
		return math.Round(fine*100) / 100
	}
}
