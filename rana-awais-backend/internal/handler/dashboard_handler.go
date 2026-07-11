package handler

import (
	"context"
	"net/http"
	"sort"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/cache"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type DashboardHandler struct{}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{}
}

func getDB() *mongo.Database {
	return config.MongoDatabase
}

func ctx() context.Context {
	return context.Background()
}

func todayRange() (time.Time, time.Time) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	end := start.Add(24 * time.Hour)
	return start, end
}

func monthRange() (time.Time, time.Time) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	end := start.AddDate(0, 1, 0)
	return start, end
}

func getCustomerCached(db *mongo.Database, id string) *domain.Customer {
	cacheKey := "customer:" + id
	if cached, found := cache.EntityCache.Get(cacheKey); found {
		return cached.(*domain.Customer)
	}
	var cust domain.Customer
	err := db.Collection("customers").FindOne(ctx(), bson.M{"_id": id}).Decode(&cust)
	if err != nil {
		return nil
	}
	cache.EntityCache.Set(cacheKey, &cust)
	return &cust
}

func getProductCached(db *mongo.Database, id string) *domain.Product {
	cacheKey := "product:" + id
	if cached, found := cache.EntityCache.Get(cacheKey); found {
		return cached.(*domain.Product)
	}
	var prod domain.Product
	err := db.Collection("products").FindOne(ctx(), bson.M{"_id": id}).Decode(&prod)
	if err != nil {
		return nil
	}
	cache.EntityCache.Set(cacheKey, &prod)
	return &prod
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD SUMMARY
// ═══════════════════════════════════════════════════════════════

func (h *DashboardHandler) Summary(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"error":    "Database not connected",
			"error_ur": "ڈیٹا بیس منسلک نہیں",
		})
		return
	}

	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	todayEnd := todayStart.Add(24 * time.Hour)
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	monthEnd := monthStart.AddDate(0, 1, 0)

	// PIPELINE 1: Today's collection
	todayCollectionTotal := 0.0
	todayCollectionCount := 0
	todayProfit := 0.0
	_ = todayCollectionCount
	payPipe := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{
			{Key: "$or", Value: []bson.D{
				{{Key: "transactiondate", Value: bson.D{{Key: "$gte", Value: todayStart}, {Key: "$lt", Value: todayEnd}}}},
				{{Key: "transactionDate", Value: bson.D{{Key: "$gte", Value: todayStart}, {Key: "$lt", Value: todayEnd}}}},
				{{Key: "paymentdate", Value: bson.D{{Key: "$gte", Value: todayStart}, {Key: "$lt", Value: todayEnd}}}},
				{{Key: "paymentDate", Value: bson.D{{Key: "$gte", Value: todayStart}, {Key: "$lt", Value: todayEnd}}}},
			}},
		}}},
		{{Key: "$group", Value: bson.D{{Key: "_id", Value: nil}, {Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}}, {Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}}}}},
	}
	payCur, err := db.Collection("payments").Aggregate(ctx(), payPipe)
	if err == nil {
		if payCur.Next(ctx()) {
			var res struct {
				Total  float64 `bson:"total"`
				Count  int     `bson:"count"`
			}
			if payCur.Decode(&res) == nil {
				todayCollectionTotal = res.Total
				todayCollectionCount = res.Count
			}
		}
		payCur.Close(ctx())
	}

	// Calculate today's profit using the accounting handler's method
	// This properly looks up purchase prices from products
	todayProfit = calculateTodayProfitFromPayments(db, todayStart, todayEnd)

	// PIPELINE 2: Total customers
	totalCustomers := int64(0)
	if count, err := db.Collection("customers").CountDocuments(ctx(), bson.M{}); err == nil {
		totalCustomers = count
	}

	// PIPELINE 3: New customers this month
	newCustomers := int64(0)
	if count, err := db.Collection("customers").CountDocuments(ctx(), bson.M{"createdat": bson.M{"$gte": monthStart, "$lt": monthEnd}}); err == nil {
		newCustomers = count
	}

	// PIPELINE 4: Total profit - calculated properly using calculatePaymentProfit
	totalProfit := 0.0
	// Get all payments and calculate profit for each
	allPayCur, err := db.Collection("payments").Find(ctx(), bson.M{})
	if err == nil {
		for allPayCur.Next(ctx()) {
			var pay domain.Payment
			if allPayCur.Decode(&pay) == nil {
				totalProfit += calculatePaymentProfit(pay, db)
			}
		}
		allPayCur.Close(ctx())
	}

	// PIPELINE 5: Daily breakdown (last 7 days)
	sevenDaysAgo := todayStart.AddDate(0, 0, -6)
	dailyPipe := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "transactiondate", Value: bson.D{{Key: "$gte", Value: sevenDaysAgo}, {Key: "$lt", Value: todayEnd}}}}}},
		{{Key: "$group", Value: bson.D{{Key: "_id", Value: bson.D{{Key: "$dateToString", Value: bson.D{{Key: "format", Value: "%Y-%m-%d"}, {Key: "date", Value: "$transactiondate"}}}}}, {Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}}, {Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}}}}},
		{{Key: "$sort", Value: bson.D{{Key: "_id", Value: 1}}}},
	}
	dailyCur, err := db.Collection("payments").Aggregate(ctx(), dailyPipe)
	dailyBreakdown := []map[string]interface{}{}
	if err == nil {
		for dailyCur.Next(ctx()) {
			var res struct {
				Date  string  `bson:"_id"`
				Total float64 `bson:"total"`
				Count int     `bson:"count"`
			}
			if dailyCur.Decode(&res) == nil {
				dailyBreakdown = append(dailyBreakdown, map[string]interface{}{"date": res.Date, "total": res.Total, "count": res.Count})
			}
		}
		dailyCur.Close(ctx())
	}

	// PIPELINE 6: Daybook details
	daybookPipe := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "transactiondate", Value: bson.D{{Key: "$gte", Value: todayStart}, {Key: "$lt", Value: todayEnd}}}}}},
		{{Key: "$sort", Value: bson.D{{Key: "transactiondate", Value: -1}}}},
		{{Key: "$limit", Value: 50}},
	}
	daybookCur, err := db.Collection("payments").Aggregate(ctx(), daybookPipe)
	daybookDetails := []map[string]interface{}{}
	if err == nil {
		for daybookCur.Next(ctx()) {
			var pay domain.Payment
			if daybookCur.Decode(&pay) == nil {
				cust := getCustomerCached(db, pay.InstallmentPlanID)
				custName := ""
				if cust != nil {
					custName = cust.Name
				}
				daybookDetails = append(daybookDetails, map[string]interface{}{
					"id": pay.ID, "customer_name": custName, "amount": pay.Amount,
					"method": pay.Method, "transaction_date": pay.TransactionDate.Format("2006-01-02"),
					"collected_by": pay.CollectedBy, "receipt_number": pay.ReceiptNumber,
				})
			}
		}
		daybookCur.Close(ctx())
	}

	// PIPELINE 7: Monthly report with $lookup
	monthlyPipe := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "status", Value: bson.M{"$in": []string{"active", "Active", "Open"}}}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "customers"}, {Key: "localField", Value: "customerid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "customer"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "products"}, {Key: "localField", Value: "productid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "product"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "payments"}, {Key: "localField", Value: "_id"}, {Key: "foreignField", Value: "installmentplanid"}, {Key: "as", Value: "payments"}}}},
	}
	monthlyCur, err := db.Collection("installment_plans").Aggregate(ctx(), monthlyPipe)

	type customerMonthlyEntry struct {
		CustomerID      string  `json:"customer_id"`
		CustomerName    string  `json:"customer_name"`
		CustomerUrdu    string  `json:"customer_urdu"`
		FatherName      string  `json:"father_name"`
		Phone           string  `json:"phone"`
		ProductName     string  `json:"product_name"`
		PlanID          string  `json:"plan_id"`
		InstallmentNo   int     `json:"installment_no"`
		DueDate         string  `json:"due_date"`
		DueAmount       float64 `json:"due_amount"`
		CollectedAmount float64 `json:"collected_amount"`
		RemainingAmount float64 `json:"remaining_amount"`
		Status          string  `json:"status"`
		CollectedDate   string  `json:"collected_date"`
		CollectedBy     string  `json:"collected_by"`
		CollectedById   string  `json:"collected_by_id"`
		PaymentMethod   string  `json:"payment_method"`
		ReceiptNumber   string  `json:"receipt_number"`
	}

	var allEntries []customerMonthlyEntry
	if err == nil {
		for monthlyCur.Next(ctx()) {
			var plan struct {
				ID                   string               `bson:"_id"`
				CustomerID           string               `bson:"customerid"`
				ProductID            string               `bson:"productid"`
				TotalAmount          float64              `bson:"totalamount"`
				DownPayment          float64              `bson:"downpayment"`
				NumberOfInstallments int                  `bson:"numinstallments"`
				Installments         []domain.InstallmentDetail `bson:"installments"`
				Customer             []domain.Customer    `bson:"customer"`
				Product              []domain.Product     `bson:"product"`
				Payments             []domain.Payment     `bson:"payments"`
			}
			if monthlyCur.Decode(&plan) != nil {
				continue
			}

			var custName, custUrdu, fatherName, phone, prodName string
			if len(plan.Customer) > 0 {
				custName = plan.Customer[0].Name
				custUrdu = plan.Customer[0].NameUrdu
				fatherName = plan.Customer[0].FatherName
				phone = plan.Customer[0].Phone
			}
			if len(plan.Product) > 0 {
				prodName = plan.Product[0].Name
			}

			paymentMap := make(map[int]domain.Payment)
			for _, p := range plan.Payments {
				paymentMap[p.InstallmentNo] = p
			}

			for _, d := range plan.Installments {
				if d.DueDate.Before(monthStart) || d.DueDate.After(monthEnd) {
					continue
				}
				if d.Paid {
					allEntries = append(allEntries, customerMonthlyEntry{
						CustomerID: plan.CustomerID, CustomerName: custName, CustomerUrdu: custUrdu,
						FatherName: fatherName, Phone: phone, ProductName: prodName, PlanID: plan.ID,
						InstallmentNo: d.InstallmentNo, DueDate: d.DueDate.Format("2006-01-02"),
						DueAmount: d.Amount, CollectedAmount: d.Amount, RemainingAmount: 0,
						Status: "collected", CollectedDate: d.DueDate.Format("2006-01-02"),
						CollectedBy: d.CollectedBy, CollectedById: d.CollectedById,
						PaymentMethod: "", ReceiptNumber: "",
					})
				} else if pay, ok := paymentMap[d.InstallmentNo]; ok {
					allEntries = append(allEntries, customerMonthlyEntry{
						CustomerID: plan.CustomerID, CustomerName: custName, CustomerUrdu: custUrdu,
						FatherName: fatherName, Phone: phone, ProductName: prodName, PlanID: plan.ID,
						InstallmentNo: d.InstallmentNo, DueDate: d.DueDate.Format("2006-01-02"),
						DueAmount: d.Amount, CollectedAmount: pay.Amount, RemainingAmount: d.Amount - pay.Amount,
						Status: "partial", CollectedDate: pay.TransactionDate.Format("2006-01-02"),
						CollectedBy: pay.CollectedBy, CollectedById: pay.CollectedById,
						PaymentMethod: pay.Method, ReceiptNumber: pay.ReceiptNumber,
					})
				} else {
					allEntries = append(allEntries, customerMonthlyEntry{
						CustomerID: plan.CustomerID, CustomerName: custName, CustomerUrdu: custUrdu,
						FatherName: fatherName, Phone: phone, ProductName: prodName, PlanID: plan.ID,
						InstallmentNo: d.InstallmentNo, DueDate: d.DueDate.Format("2006-01-02"),
						DueAmount: d.Amount, CollectedAmount: 0, RemainingAmount: d.Amount,
						Status: "pending",
					})
				}
			}
		}
		monthlyCur.Close(ctx())
	}

	var collectedCustomers []customerMonthlyEntry
	var remainingCustomers []customerMonthlyEntry
	totalDueAmount := 0.0
	totalCollectedAmount := 0.0
	totalRemainingAmount := 0.0

	for _, entry := range allEntries {
		totalDueAmount += entry.DueAmount
		totalCollectedAmount += entry.CollectedAmount
		totalRemainingAmount += entry.RemainingAmount
		if entry.Status == "collected" {
			collectedCustomers = append(collectedCustomers, entry)
		} else {
			remainingCustomers = append(remainingCustomers, entry)
		}
	}

	sort.Slice(collectedCustomers, func(i, j int) bool { return collectedCustomers[i].CustomerName < collectedCustomers[j].CustomerName })
	sort.Slice(remainingCustomers, func(i, j int) bool { return remainingCustomers[i].CustomerName < remainingCustomers[j].CustomerName })

	if collectedCustomers == nil {
		collectedCustomers = []customerMonthlyEntry{}
	}
	if remainingCustomers == nil {
		remainingCustomers = []customerMonthlyEntry{}
	}

	// ─────────────────────────────────────────────────────────────
	// PENDING CALCULATION: Payment-based (consistent with modal)
	// TotalAmount - all payments (includes down payment which is in payments collection)
	// ─────────────────────────────────────────────────────────────
	pendingTotal := 0.0
	pendingCustomersCount := 0
	pendingCustSet := make(map[string]bool)

	// Fetch all active plans
	pendingCur, err := db.Collection("installment_plans").Find(ctx(), bson.M{"status": bson.M{"$in": []string{"active", "Active", "Open"}}})
	if err == nil {
		for pendingCur.Next(ctx()) {
			var plan domain.InstallmentPlan
			if pendingCur.Decode(&plan) != nil {
				continue
			}
			// Calculate total paid from payments collection (includes down payment)
			totalPaid := 0.0
			payCur, payErr := db.Collection("payments").Find(ctx(), bson.M{
				"$or": []interface{}{
					bson.M{"installmentplanid": plan.ID},
					bson.M{"installmentPlanId": plan.ID},
				},
			})
			if payErr == nil {
				for payCur.Next(ctx()) {
					var pay domain.Payment
					if payCur.Decode(&pay) == nil {
						totalPaid += pay.Amount
					}
				}
				payCur.Close(ctx())
			}
			planRemaining := plan.TotalAmount - totalPaid
			if planRemaining < 0 {
				planRemaining = 0
			}
			if planRemaining > 0 {
				pendingTotal += planRemaining
				if !pendingCustSet[plan.CustomerID] {
					pendingCustSet[plan.CustomerID] = true
					pendingCustomersCount++
				}
			}
		}
		pendingCur.Close(ctx())
	}

	// Month revenue & profit: sum payments in this month
	monthRevenue := 0.0
	monthProfit := 0.0
	monthPayPipe := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "transactiondate", Value: bson.D{{Key: "$gte", Value: monthStart}, {Key: "$lt", Value: monthEnd}}}}}},
		{{Key: "$group", Value: bson.D{{Key: "_id", Value: nil}, {Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}}}}},
	}
	monthPayCur, err := db.Collection("payments").Aggregate(ctx(), monthPayPipe)
	if err == nil {
		if monthPayCur.Next(ctx()) {
			var res struct {
				Total  float64 `bson:"total"`
			}
			if monthPayCur.Decode(&res) == nil {
				monthRevenue = res.Total
			}
		}
		monthPayCur.Close(ctx())
	}
	// Calculate month profit properly using calculatePaymentProfit
	monthProfit = calculateTodayProfitFromPayments(db, monthStart, monthEnd)

	// Active & completed installments count
	activeInstallments := int64(0)
	completedInstallments := int64(0)
	if count, err := db.Collection("installment_plans").CountDocuments(ctx(), bson.M{"status": bson.M{"$in": []string{"active", "Active", "Open"}}}); err == nil {
		activeInstallments = count
	}
	if count, err := db.Collection("installment_plans").CountDocuments(ctx(), bson.M{"status": bson.M{"$in": []string{"completed", "Completed", "Closed", "paid"}}}); err == nil {
		completedInstallments = count
	}

	// Overdue count: active plans with at least one unpaid installment past due
	overdueCount := int64(0)
	overduePipe := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "status", Value: bson.M{"$in": []string{"active", "Active", "Open"}}}}}},
		{{Key: "$unwind", Value: "$installments"}},
		{{Key: "$match", Value: bson.D{{Key: "installments.paid", Value: false}, {Key: "installments.due_date", Value: bson.D{{Key: "$lt", Value: todayStart}}}}}},
		{{Key: "$group", Value: bson.D{{Key: "_id", Value: "$_id"}}}},
		{{Key: "$count", Value: "count"}},
	}
	overdueCur, err := db.Collection("installment_plans").Aggregate(ctx(), overduePipe)
	if err == nil {
		if overdueCur.Next(ctx()) {
			var res struct{ Count int64 `bson:"count"` }
			if overdueCur.Decode(&res) == nil {
				overdueCount = res.Count
			}
		}
		overdueCur.Close(ctx())
	}

	// Today due count
	todayDueCount := int64(0)
	todayDuePipe := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "status", Value: bson.M{"$in": []string{"active", "Active", "Open"}}}}}},
		{{Key: "$unwind", Value: "$installments"}},
		{{Key: "$match", Value: bson.D{{Key: "installments.paid", Value: false}, {Key: "installments.due_date", Value: bson.D{{Key: "$gte", Value: todayStart}, {Key: "$lt", Value: todayEnd}}}}}},
		{{Key: "$count", Value: "count"}},
	}
	todayDueCur, err := db.Collection("installment_plans").Aggregate(ctx(), todayDuePipe)
	if err == nil {
		if todayDueCur.Next(ctx()) {
			var res struct{ Count int64 `bson:"count"` }
			if todayDueCur.Decode(&res) == nil {
				todayDueCount = res.Count
			}
		}
		todayDueCur.Close(ctx())
	}

	// Total products & low stock
	totalProducts := int64(0)
	lowStock := int64(0)
	if count, err := db.Collection("products").CountDocuments(ctx(), bson.M{}); err == nil {
		totalProducts = count
	}
	if count, err := db.Collection("products").CountDocuments(ctx(), bson.M{"stockcount": bson.M{"$lte": 5}}); err == nil {
		lowStock = count
	}

	// Monthly due count
	monthlyDueCount := int64(0)
	monthlyDuePipe := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "status", Value: bson.M{"$in": []string{"active", "Active", "Open"}}}}}},
		{{Key: "$unwind", Value: "$installments"}},
		{{Key: "$match", Value: bson.D{{Key: "installments.paid", Value: false}, {Key: "installments.due_date", Value: bson.D{{Key: "$gte", Value: monthStart}, {Key: "$lt", Value: monthEnd}}}}}},
		{{Key: "$count", Value: "count"}},
	}
	monthlyDueCur, err := db.Collection("installment_plans").Aggregate(ctx(), monthlyDuePipe)
	if err == nil {
		if monthlyDueCur.Next(ctx()) {
			var res struct{ Count int64 `bson:"count"` }
			if monthlyDueCur.Decode(&res) == nil {
				monthlyDueCount = res.Count
			}
		}
		monthlyDueCur.Close(ctx())
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"total_collection": todayCollectionTotal,
		"total_customers":  totalCustomers,
		"totalCustomers":   totalCustomers,
		"new_customers":    newCustomers,
		"newCustomers":     newCustomers,
		"total_profit":     totalProfit,
		"totalProfit":      totalProfit,
		"daily_breakdown":  dailyBreakdown,
		"daybook_details":  daybookDetails,

		// Monthly installment collected/remaining
		"total_due_amount":       totalDueAmount,
		"total_collected_amount": totalCollectedAmount,
		"total_remaining_amount": totalRemainingAmount,
		"collected_count":        len(collectedCustomers),
		"remaining_count":        len(remainingCustomers),
		"collected_customers":    collectedCustomers,
		"remaining_customers":    remainingCustomers,

		// ─── NEW FIELDS for Quick Summary Cards ───
		"todayCollection": map[string]interface{}{
			"total": todayCollectionTotal,
			"count": todayCollectionCount,
		},
		"todayRevenue":      todayCollectionTotal,
		"todayProfit":       todayProfit,
		"totalPending":      pendingTotal,
		"pendingCustomers":  pendingCustomersCount,
		"pendingTotal":      pendingTotal,
		"totalPaid":         totalCollectedAmount,
		"monthRevenue":      monthRevenue,
		"monthProfit":       monthProfit,
		"activeInstallments": activeInstallments,
		"completedInstallments": completedInstallments,
		"overdueCount":      overdueCount,
		"todayDueCount":     todayDueCount,
		"totalProducts":     totalProducts,
		"lowStock":          lowStock,
		"monthlyDueCount":   monthlyDueCount,
	})
}

// ═══════════════════════════════════════════════════════════════
// calculateTodayProfitFromPayments - properly calculates profit
// by looking up each payment's installment plan and product purchase price
// ═══════════════════════════════════════════════════════════════

func calculateTodayProfitFromPayments(db *mongo.Database, start, end time.Time) float64 {
	totalProfit := 0.0
	cursor, err := db.Collection("payments").Find(ctx(), bson.M{
		"$or": []interface{}{
			bson.M{"transactiondate": bson.M{"$gte": start, "$lt": end}},
			bson.M{"transactionDate": bson.M{"$gte": start, "$lt": end}},
			bson.M{"paymentdate": bson.M{"$gte": start, "$lt": end}},
			bson.M{"paymentDate": bson.M{"$gte": start, "$lt": end}},
		},
	})
	if err != nil {
		return 0
	}
	defer cursor.Close(ctx())

	for cursor.Next(ctx()) {
		var pay domain.Payment
		if cursor.Decode(&pay) != nil {
			continue
		}
		profit := calculatePaymentProfit(pay, db)
		totalProfit += profit
	}
	return totalProfit
}

// ═══════════════════════════════════════════════════════════════
// OVERDUE DETAILS
// ═══════════════════════════════════════════════════════════════

func (h *DashboardHandler) OverdueDetails(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "status", Value: bson.M{"$in": []string{"active", "Active", "Open"}}}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "customers"}, {Key: "localField", Value: "customerid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "customer"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "products"}, {Key: "localField", Value: "productid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "product"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "payments"}, {Key: "localField", Value: "_id"}, {Key: "foreignField", Value: "installmentplanid"}, {Key: "as", Value: "payments"}}}},
	}

	cursor, err := db.Collection("installment_plans").Aggregate(ctx(), pipeline)
	if err != nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer cursor.Close(ctx())

	var result []map[string]interface{}
	for cursor.Next(ctx()) {
		var plan struct {
			ID                   string               `bson:"_id"`
			CustomerID           string               `bson:"customerid"`
			ProductID            string               `bson:"productid"`
			TotalAmount          float64              `bson:"totalamount"`
			DownPayment          float64              `bson:"downpayment"`
			NumberOfInstallments int                  `bson:"numinstallments"`
			Installments         []domain.InstallmentDetail `bson:"installments"`
			Customer             []domain.Customer    `bson:"customer"`
			Product              []domain.Product     `bson:"product"`
			Payments             []domain.Payment     `bson:"payments"`
			CreatedAt            time.Time            `bson:"createdat"`
		}
		if cursor.Decode(&plan) != nil || len(plan.Customer) == 0 {
			continue
		}
		cust := plan.Customer[0]
		var prodName string
		if len(plan.Product) > 0 {
			prodName = plan.Product[0].Name
		}

		totalPaidOnPlan := 0.0
		for _, pay := range plan.Payments {
			totalPaidOnPlan += pay.Amount
		}
		// NOTE: Payments collection already includes down payment, so don't subtract plan.DownPayment again
		planRemaining := plan.TotalAmount - totalPaidOnPlan
		if planRemaining < 0 {
			planRemaining = 0
		}

		paidCount := 0
		for _, inst := range plan.Installments {
			if inst.Paid {
				paidCount++
			}
		}

		for _, d := range plan.Installments {
			if d.Paid || !d.DueDate.Before(todayStart) {
				continue
			}
			result = append(result, map[string]interface{}{
				"plan_id": plan.ID, "customer_id": cust.ID, "customer_name": cust.Name,
				"customer_urdu": cust.NameUrdu, "father_name": cust.FatherName, "phone": cust.Phone,
				"cnic": cust.CNIC, "address": cust.Address, "address_urdu": cust.AddressUrdu,
				"product_name": prodName, "installment_no": d.InstallmentNo,
				"due_date": d.DueDate.Format("2006-01-02"), "amount": d.Amount, "fine": d.Fine,
				"days_overdue": int(time.Since(d.DueDate).Hours() / 24),
				"total_installments": plan.NumberOfInstallments, "paid_count": paidCount,
				"remaining": planRemaining, "total_amount": plan.TotalAmount,
				"down_payment": plan.DownPayment, "created_at": plan.CreatedAt.Format("2006-01-02"),
			})
		}
	}

	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
}

// ═══════════════════════════════════════════════════════════════
// TODAY DUE DETAILS
// ═══════════════════════════════════════════════════════════════

func (h *DashboardHandler) TodayDueDetails(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	todayStart, todayEnd := todayRange()
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "status", Value: bson.M{"$in": []string{"active", "Active", "Open"}}}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "customers"}, {Key: "localField", Value: "customerid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "customer"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "products"}, {Key: "localField", Value: "productid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "product"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "payments"}, {Key: "localField", Value: "_id"}, {Key: "foreignField", Value: "installmentplanid"}, {Key: "as", Value: "payments"}}}},
	}

	cursor, err := db.Collection("installment_plans").Aggregate(ctx(), pipeline)
	if err != nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer cursor.Close(ctx())

	var result []map[string]interface{}
	for cursor.Next(ctx()) {
		var plan struct {
			ID                   string               `bson:"_id"`
			CustomerID           string               `bson:"customerid"`
			ProductID            string               `bson:"productid"`
			TotalAmount          float64              `bson:"totalamount"`
			DownPayment          float64              `bson:"downpayment"`
			NumberOfInstallments int                  `bson:"numinstallments"`
			Installments         []domain.InstallmentDetail `bson:"installments"`
			Customer             []domain.Customer    `bson:"customer"`
			Product              []domain.Product     `bson:"product"`
			Payments             []domain.Payment     `bson:"payments"`
			CreatedAt            time.Time            `bson:"createdat"`
		}
		if cursor.Decode(&plan) != nil || len(plan.Customer) == 0 {
			continue
		}
		cust := plan.Customer[0]
		var prodName string
		if len(plan.Product) > 0 {
			prodName = plan.Product[0].Name
		}

		totalPaidOnPlan := 0.0
		for _, pay := range plan.Payments {
			totalPaidOnPlan += pay.Amount
		}
		// NOTE: Payments collection already includes down payment, so don't subtract plan.DownPayment again
		planRemaining := plan.TotalAmount - totalPaidOnPlan
		if planRemaining < 0 {
			planRemaining = 0
		}

		paidCount := 0
		for _, inst := range plan.Installments {
			if inst.Paid {
				paidCount++
			}
		}

		for _, d := range plan.Installments {
			if d.Paid || d.DueDate.Before(todayStart) || d.DueDate.After(todayEnd) {
				continue
			}
			result = append(result, map[string]interface{}{
				"plan_id": plan.ID, "customer_id": cust.ID, "customer_name": cust.Name,
				"customer_urdu": cust.NameUrdu, "father_name": cust.FatherName, "phone": cust.Phone,
				"cnic": cust.CNIC, "address": cust.Address, "address_urdu": cust.AddressUrdu,
				"product_name": prodName, "installment_no": d.InstallmentNo,
				"due_date": d.DueDate.Format("2006-01-02"), "amount": d.Amount, "fine": d.Fine,
				"total_installments": plan.NumberOfInstallments, "paid_count": paidCount,
				"remaining": planRemaining, "total_amount": plan.TotalAmount,
				"down_payment": plan.DownPayment, "created_at": plan.CreatedAt.Format("2006-01-02"),
			})
		}
	}

	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
}

// ═══════════════════════════════════════════════════════════════
// LOW STOCK DETAILS
// ═══════════════════════════════════════════════════════════════

func (h *DashboardHandler) LowStockDetails(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	cursor, err := db.Collection("products").Find(ctx(), bson.M{"stockcount": bson.M{"$lte": 5}})
	if err != nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer cursor.Close(ctx())

	var result []map[string]interface{}
	for cursor.Next(ctx()) {
		var prod domain.Product
		if cursor.Decode(&prod) == nil {
			result = append(result, map[string]interface{}{
				"id": prod.ID, "name": prod.Name, "name_urdu": prod.NameUrdu,
				"stock_count": prod.StockCount, "purchase_price": prod.PurchasePrice,
			})
		}
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
}

// ═══════════════════════════════════════════════════════════════
// MONTHLY DUE DETAILS
// ═══════════════════════════════════════════════════════════════

func (h *DashboardHandler) MonthlyDueDetails(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	monthStart, monthEnd := monthRange()
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "status", Value: bson.M{"$in": []string{"active", "Active", "Open"}}}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "customers"}, {Key: "localField", Value: "customerid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "customer"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "products"}, {Key: "localField", Value: "productid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "product"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "payments"}, {Key: "localField", Value: "_id"}, {Key: "foreignField", Value: "installmentplanid"}, {Key: "as", Value: "payments"}}}},
	}

	cursor, err := db.Collection("installment_plans").Aggregate(ctx(), pipeline)
	if err != nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer cursor.Close(ctx())

	var result []map[string]interface{}
	for cursor.Next(ctx()) {
		var plan struct {
			ID                   string               `bson:"_id"`
			CustomerID           string               `bson:"customerid"`
			ProductID            string               `bson:"productid"`
			TotalAmount          float64              `bson:"totalamount"`
			DownPayment          float64              `bson:"downpayment"`
			NumberOfInstallments int                  `bson:"numinstallments"`
			Installments         []domain.InstallmentDetail `bson:"installments"`
			Customer             []domain.Customer    `bson:"customer"`
			Product              []domain.Product     `bson:"product"`
			Payments             []domain.Payment     `bson:"payments"`
			CreatedAt            time.Time            `bson:"createdat"`
		}
		if cursor.Decode(&plan) != nil || len(plan.Customer) == 0 {
			continue
		}
		cust := plan.Customer[0]
		var prodName string
		if len(plan.Product) > 0 {
			prodName = plan.Product[0].Name
		}

		totalPaidOnPlan := 0.0
		for _, pay := range plan.Payments {
			totalPaidOnPlan += pay.Amount
		}
		// NOTE: Payments collection already includes down payment, so don't subtract plan.DownPayment again
		planRemaining := plan.TotalAmount - totalPaidOnPlan
		if planRemaining < 0 {
			planRemaining = 0
		}

		paidCount := 0
		for _, inst := range plan.Installments {
			if inst.Paid {
				paidCount++
			}
		}

		for _, d := range plan.Installments {
			if d.Paid || d.DueDate.Before(monthStart) || d.DueDate.After(monthEnd) {
				continue
			}
			result = append(result, map[string]interface{}{
				"plan_id": plan.ID, "customer_id": cust.ID, "customer_name": cust.Name,
				"customer_urdu": cust.NameUrdu, "father_name": cust.FatherName, "phone": cust.Phone,
				"cnic": cust.CNIC, "address": cust.Address, "address_urdu": cust.AddressUrdu,
				"product_name": prodName, "installment_no": d.InstallmentNo,
				"due_date": d.DueDate.Format("2006-01-02"), "amount": d.Amount, "fine": d.Fine,
				"total_installments": plan.NumberOfInstallments, "paid_count": paidCount,
				"remaining": planRemaining, "total_amount": plan.TotalAmount,
				"down_payment": plan.DownPayment, "created_at": plan.CreatedAt.Format("2006-01-02"),
			})
		}
	}

	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
}

// ═══════════════════════════════════════════════════════════════
// TODAY INSTALLMENTS
// ═══════════════════════════════════════════════════════════════

func (h *DashboardHandler) TodayInstallments(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	todayStart, todayEnd := todayRange()
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "status", Value: bson.M{"$in": []string{"active", "Active", "Open"}}}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "customers"}, {Key: "localField", Value: "customerid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "customer"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "products"}, {Key: "localField", Value: "productid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "product"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "payments"}, {Key: "localField", Value: "_id"}, {Key: "foreignField", Value: "installmentplanid"}, {Key: "as", Value: "payments"}}}},
	}

	cursor, err := db.Collection("installment_plans").Aggregate(ctx(), pipeline)
	if err != nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer cursor.Close(ctx())

	var result []map[string]interface{}
	for cursor.Next(ctx()) {
		var plan struct {
			ID                   string               `bson:"_id"`
			CustomerID           string               `bson:"customerid"`
			ProductID            string               `bson:"productid"`
			TotalAmount          float64              `bson:"totalamount"`
			DownPayment          float64              `bson:"downpayment"`
			NumberOfInstallments int                  `bson:"numinstallments"`
			Installments         []domain.InstallmentDetail `bson:"installments"`
			Customer             []domain.Customer    `bson:"customer"`
			Product              []domain.Product     `bson:"product"`
			Payments             []domain.Payment     `bson:"payments"`
			CreatedAt            time.Time            `bson:"createdat"`
		}
		if cursor.Decode(&plan) != nil || len(plan.Customer) == 0 {
			continue
		}
		cust := plan.Customer[0]
		var prodName string
		if len(plan.Product) > 0 {
			prodName = plan.Product[0].Name
		}

		totalPaidOnPlan := 0.0
		for _, pay := range plan.Payments {
			totalPaidOnPlan += pay.Amount
		}
		// NOTE: Payments collection already includes down payment, so don't subtract plan.DownPayment again
		planRemaining := plan.TotalAmount - totalPaidOnPlan
		if planRemaining < 0 {
			planRemaining = 0
		}

		paidCount := 0
		for _, inst := range plan.Installments {
			if inst.Paid {
				paidCount++
			}
		}

		for _, d := range plan.Installments {
			if d.Paid || d.DueDate.Before(todayStart) || d.DueDate.After(todayEnd) {
				continue
			}
			result = append(result, map[string]interface{}{
				"plan_id": plan.ID, "customer_id": cust.ID, "customer_name": cust.Name,
				"customer_urdu": cust.NameUrdu, "father_name": cust.FatherName, "phone": cust.Phone,
				"cnic": cust.CNIC, "address": cust.Address, "address_urdu": cust.AddressUrdu,
				"product_name": prodName, "installment_no": d.InstallmentNo,
				"due_date": d.DueDate.Format("2006-01-02"), "amount": d.Amount, "fine": d.Fine,
				"total_installments": plan.NumberOfInstallments, "paid_count": paidCount,
				"remaining": planRemaining, "total_amount": plan.TotalAmount,
				"down_payment": plan.DownPayment, "created_at": plan.CreatedAt.Format("2006-01-02"),
			})
		}
	}

	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
}

// ═══════════════════════════════════════════════════════════════
// TODAY INSTALLMENT STATS
// ═══════════════════════════════════════════════════════════════

func (h *DashboardHandler) TodayInstallmentStats(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"total": 0, "collected": 0, "pending": 0, "overdue": 0,
		})
		return
	}

	todayStart, todayEnd := todayRange()

	// Total installments due today
	totalDue := int64(0)
	totalDuePipe := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "status", Value: bson.M{"$in": []string{"active", "Active", "Open"}}}}}},
		{{Key: "$unwind", Value: "$installments"}},
		{{Key: "$match", Value: bson.D{{Key: "installments.due_date", Value: bson.D{{Key: "$gte", Value: todayStart}, {Key: "$lt", Value: todayEnd}}}}}},
		{{Key: "$count", Value: "count"}},
	}
	totalCur, err := db.Collection("installment_plans").Aggregate(ctx(), totalDuePipe)
	if err == nil {
		if totalCur.Next(ctx()) {
			var res struct{ Count int64 `bson:"count"` }
			if totalCur.Decode(&res) == nil {
				totalDue = res.Count
			}
		}
		totalCur.Close(ctx())
	}

	// Collected today
	collectedToday := int64(0)
	collectedPipe := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "transactiondate", Value: bson.D{{Key: "$gte", Value: todayStart}, {Key: "$lt", Value: todayEnd}}}}}},
		{{Key: "$count", Value: "count"}},
	}
	collectedCur, err := db.Collection("payments").Aggregate(ctx(), collectedPipe)
	if err == nil {
		if collectedCur.Next(ctx()) {
			var res struct{ Count int64 `bson:"count"` }
			if collectedCur.Decode(&res) == nil {
				collectedToday = res.Count
			}
		}
		collectedCur.Close(ctx())
	}

	pending := totalDue - collectedToday
	if pending < 0 {
		pending = 0
	}

	// Overdue (past due, unpaid)
	overdue := int64(0)
	overduePipe := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "status", Value: bson.M{"$in": []string{"active", "Active", "Open"}}}}}},
		{{Key: "$unwind", Value: "$installments"}},
		{{Key: "$match", Value: bson.D{{Key: "installments.paid", Value: false}, {Key: "installments.due_date", Value: bson.D{{Key: "$lt", Value: todayStart}}}}}},
		{{Key: "$count", Value: "count"}},
	}
	overdueCur, err := db.Collection("installment_plans").Aggregate(ctx(), overduePipe)
	if err == nil {
		if overdueCur.Next(ctx()) {
			var res struct{ Count int64 `bson:"count"` }
			if overdueCur.Decode(&res) == nil {
				overdue = res.Count
			}
		}
		overdueCur.Close(ctx())
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"total":     totalDue,
		"collected": collectedToday,
		"pending":   pending,
		"overdue":   overdue,
	})
}

// ═══════════════════════════════════════════════════════════════
// MONTHLY REPORT
// ═══════════════════════════════════════════════════════════════

func (h *DashboardHandler) MonthlyReport(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"total_due": 0, "total_collected": 0, "total_remaining": 0,
			"collected": []interface{}{}, "remaining": []interface{}{},
		})
		return
	}

	monthStart, monthEnd := monthRange()
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "status", Value: bson.M{"$in": []string{"active", "Active", "Open"}}}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "customers"}, {Key: "localField", Value: "customerid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "customer"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "products"}, {Key: "localField", Value: "productid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "product"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "payments"}, {Key: "localField", Value: "_id"}, {Key: "foreignField", Value: "installmentplanid"}, {Key: "as", Value: "payments"}}}},
	}

	cursor, err := db.Collection("installment_plans").Aggregate(ctx(), pipeline)
	if err != nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"total_due": 0, "total_collected": 0, "total_remaining": 0,
			"collected": []interface{}{}, "remaining": []interface{}{},
		})
		return
	}
	defer cursor.Close(ctx())

	type entry struct {
		CustomerID      string  `json:"customer_id"`
		CustomerName    string  `json:"customer_name"`
		CustomerUrdu    string  `json:"customer_urdu"`
		FatherName      string  `json:"father_name"`
		Phone           string  `json:"phone"`
		ProductName     string  `json:"product_name"`
		PlanID          string  `json:"plan_id"`
		InstallmentNo   int     `json:"installment_no"`
		DueDate         string  `json:"due_date"`
		DueAmount       float64 `json:"due_amount"`
		CollectedAmount float64 `json:"collected_amount"`
		RemainingAmount float64 `json:"remaining_amount"`
		Status          string  `json:"status"`
		CollectedDate   string  `json:"collected_date"`
		CollectedBy     string  `json:"collected_by"`
		PaymentMethod   string  `json:"payment_method"`
		ReceiptNumber   string  `json:"receipt_number"`
	}

	var allEntries []entry
	for cursor.Next(ctx()) {
		var plan struct {
			ID                   string               `bson:"_id"`
			CustomerID           string               `bson:"customerid"`
			ProductID            string               `bson:"productid"`
			TotalAmount          float64              `bson:"totalamount"`
			DownPayment          float64              `bson:"downpayment"`
			NumberOfInstallments int                  `bson:"numinstallments"`
			Installments         []domain.InstallmentDetail `bson:"installments"`
			Customer             []domain.Customer    `bson:"customer"`
			Product              []domain.Product     `bson:"product"`
			Payments             []domain.Payment     `bson:"payments"`
		}
		if cursor.Decode(&plan) != nil {
			continue
		}

		var custName, custUrdu, fatherName, phone, prodName string
		if len(plan.Customer) > 0 {
			custName = plan.Customer[0].Name
			custUrdu = plan.Customer[0].NameUrdu
			fatherName = plan.Customer[0].FatherName
			phone = plan.Customer[0].Phone
		}
		if len(plan.Product) > 0 {
			prodName = plan.Product[0].Name
		}

		paymentMap := make(map[int]domain.Payment)
		for _, p := range plan.Payments {
			paymentMap[p.InstallmentNo] = p
		}

		for _, d := range plan.Installments {
			if d.DueDate.Before(monthStart) || d.DueDate.After(monthEnd) {
				continue
			}
			if d.Paid {
				allEntries = append(allEntries, entry{
					CustomerID: plan.CustomerID, CustomerName: custName, CustomerUrdu: custUrdu,
					FatherName: fatherName, Phone: phone, ProductName: prodName, PlanID: plan.ID,
					InstallmentNo: d.InstallmentNo, DueDate: d.DueDate.Format("2006-01-02"),
					DueAmount: d.Amount, CollectedAmount: d.Amount, RemainingAmount: 0,
					Status: "collected", CollectedDate: d.DueDate.Format("2006-01-02"),
					CollectedBy: d.CollectedBy, PaymentMethod: "", ReceiptNumber: "",
				})
			} else if pay, ok := paymentMap[d.InstallmentNo]; ok {
				allEntries = append(allEntries, entry{
					CustomerID: plan.CustomerID, CustomerName: custName, CustomerUrdu: custUrdu,
					FatherName: fatherName, Phone: phone, ProductName: prodName, PlanID: plan.ID,
					InstallmentNo: d.InstallmentNo, DueDate: d.DueDate.Format("2006-01-02"),
					DueAmount: d.Amount, CollectedAmount: pay.Amount, RemainingAmount: d.Amount - pay.Amount,
					Status: "partial", CollectedDate: pay.TransactionDate.Format("2006-01-02"),
					CollectedBy: pay.CollectedBy, PaymentMethod: pay.Method, ReceiptNumber: pay.ReceiptNumber,
				})
			} else {
				allEntries = append(allEntries, entry{
					CustomerID: plan.CustomerID, CustomerName: custName, CustomerUrdu: custUrdu,
					FatherName: fatherName, Phone: phone, ProductName: prodName, PlanID: plan.ID,
					InstallmentNo: d.InstallmentNo, DueDate: d.DueDate.Format("2006-01-02"),
					DueAmount: d.Amount, CollectedAmount: 0, RemainingAmount: d.Amount,
					Status: "pending",
				})
			}
		}
	}

	var collected []entry
	var remaining []entry
	totalDue := 0.0
	totalCollected := 0.0
	totalRemaining := 0.0

	for _, e := range allEntries {
		totalDue += e.DueAmount
		totalCollected += e.CollectedAmount
		totalRemaining += e.RemainingAmount
		if e.Status == "collected" {
			collected = append(collected, e)
		} else {
			remaining = append(remaining, e)
		}
	}

	if collected == nil {
		collected = []entry{}
	}
	if remaining == nil {
		remaining = []entry{}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"total_due": totalDue, "total_collected": totalCollected, "total_remaining": totalRemaining,
		"collected": collected, "remaining": remaining,
	})
}

// ═══════════════════════════════════════════════════════════════
// ACTIVE INSTALLMENTS
// ═══════════════════════════════════════════════════════════════

func (h *DashboardHandler) ActiveInstallments(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "status", Value: bson.M{"$in": []string{"active", "Active", "Open"}}}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "customers"}, {Key: "localField", Value: "customerid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "customer"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "products"}, {Key: "localField", Value: "productid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "product"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "payments"}, {Key: "localField", Value: "_id"}, {Key: "foreignField", Value: "installmentplanid"}, {Key: "as", Value: "payments"}}}},
	}

	cursor, err := db.Collection("installment_plans").Aggregate(ctx(), pipeline)
	if err != nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer cursor.Close(ctx())

	var result []map[string]interface{}
	for cursor.Next(ctx()) {
		var plan struct {
			ID                   string               `bson:"_id"`
			CustomerID           string               `bson:"customerid"`
			ProductID            string               `bson:"productid"`
			TotalAmount          float64              `bson:"totalamount"`
			DownPayment          float64              `bson:"downpayment"`
			NumberOfInstallments int                  `bson:"numinstallments"`
			Installments         []domain.InstallmentDetail `bson:"installments"`
			Customer             []domain.Customer    `bson:"customer"`
			Product              []domain.Product     `bson:"product"`
			Payments             []domain.Payment     `bson:"payments"`
			CreatedAt            time.Time            `bson:"createdat"`
		}
		if cursor.Decode(&plan) != nil || len(plan.Customer) == 0 {
			continue
		}
		cust := plan.Customer[0]
		var prodName string
		if len(plan.Product) > 0 {
			prodName = plan.Product[0].Name
		}

		totalPaidOnPlan := 0.0
		for _, pay := range plan.Payments {
			totalPaidOnPlan += pay.Amount
		}
		// NOTE: Payments collection already includes down payment, so don't subtract plan.DownPayment again
		planRemaining := plan.TotalAmount - totalPaidOnPlan
		if planRemaining < 0 {
			planRemaining = 0
		}

		paidCount := 0
		for _, inst := range plan.Installments {
			if inst.Paid {
				paidCount++
			}
		}
		// Count payments as installments paid (exclude down payment installment_no=0)
		installmentPayments := 0
		for _, pay := range plan.Payments {
			if pay.InstallmentNo > 0 {
				installmentPayments++
			}
		}
		// Use max of paid installments vs payment count for accurate display
		if installmentPayments > paidCount {
			paidCount = installmentPayments
		}

		result = append(result, map[string]interface{}{
			"plan_id": plan.ID, "customer_id": cust.ID, "customer_name": cust.Name,
			"customer_urdu": cust.NameUrdu, "father_name": cust.FatherName, "phone": cust.Phone,
			"cnic": cust.CNIC, "address": cust.Address, "address_urdu": cust.AddressUrdu,
			"product_name": prodName,
			"total_amount": plan.TotalAmount, "down_payment": plan.DownPayment,
			"total_installments": plan.NumberOfInstallments, "paid_count": paidCount,
			"paid_amount": totalPaidOnPlan,
			"remaining": planRemaining, "created_at": plan.CreatedAt.Format("2006-01-02"),
		})
	}

	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
}

// ═══════════════════════════════════════════════════════════════
// COMPLETED INSTALLMENTS
// ═══════════════════════════════════════════════════════════════

func (h *DashboardHandler) CompletedInstallments(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "status", Value: bson.M{"$in": []string{"completed", "Completed", "Closed", "paid"}}}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "customers"}, {Key: "localField", Value: "customerid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "customer"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "products"}, {Key: "localField", Value: "productid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "product"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "payments"}, {Key: "localField", Value: "_id"}, {Key: "foreignField", Value: "installmentplanid"}, {Key: "as", Value: "payments"}}}},
	}

	cursor, err := db.Collection("installment_plans").Aggregate(ctx(), pipeline)
	if err != nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer cursor.Close(ctx())

	var result []map[string]interface{}
	for cursor.Next(ctx()) {
		var plan struct {
			ID                   string               `bson:"_id"`
			CustomerID           string               `bson:"customerid"`
			ProductID            string               `bson:"productid"`
			TotalAmount          float64              `bson:"totalamount"`
			DownPayment          float64              `bson:"downpayment"`
			NumberOfInstallments int                  `bson:"numinstallments"`
			Installments         []domain.InstallmentDetail `bson:"installments"`
			Customer             []domain.Customer    `bson:"customer"`
			Product              []domain.Product     `bson:"product"`
			Payments             []domain.Payment     `bson:"payments"`
			CreatedAt            time.Time            `bson:"createdat"`
		}
		if cursor.Decode(&plan) != nil || len(plan.Customer) == 0 {
			continue
		}
		cust := plan.Customer[0]
		var prodName string
		if len(plan.Product) > 0 {
			prodName = plan.Product[0].Name
		}

		totalPaidOnPlan := 0.0
		for _, pay := range plan.Payments {
			totalPaidOnPlan += pay.Amount
		}
		// NOTE: Payments collection already includes down payment, so don't subtract plan.DownPayment again
		planRemaining := plan.TotalAmount - totalPaidOnPlan
		if planRemaining < 0 {
			planRemaining = 0
		}

		paidCount := 0
		for _, inst := range plan.Installments {
			if inst.Paid {
				paidCount++
			}
		}

		result = append(result, map[string]interface{}{
			"plan_id": plan.ID, "customer_id": cust.ID, "customer_name": cust.Name,
			"customer_urdu": cust.NameUrdu, "father_name": cust.FatherName, "phone": cust.Phone,
			"cnic": cust.CNIC, "address": cust.Address, "address_urdu": cust.AddressUrdu,
			"product_name": prodName,
			"total_amount": plan.TotalAmount, "down_payment": plan.DownPayment,
			"total_installments": plan.NumberOfInstallments, "paid_count": paidCount,
			"remaining": planRemaining, "created_at": plan.CreatedAt.Format("2006-01-02"),
		})
	}

	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
}

// ═══════════════════════════════════════════════════════════════
// CUSTOMERS WITH FINANCE
// ═══════════════════════════════════════════════════════════════

func (h *DashboardHandler) CustomersWithFinance(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	// Step 1: Get ALL customers first
	custCursor, err := db.Collection("customers").Find(ctx(), bson.M{})
	if err != nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer custCursor.Close(ctx())

	// Step 2: For each customer, calculate total remaining balance from all their plans
	type customerFinance struct {
		ID               string  `bson:"_id"`
		Name             string  `bson:"name"`
		NameUrdu         string  `bson:"nameurdu"`
		FatherName       string  `bson:"fathername"`
		Phone            string  `bson:"phone"`
		CNIC             string  `bson:"cnic"`
		Address          string  `bson:"address"`
		AddressUrdu      string  `bson:"addressurdu"`
		CreatedAt        time.Time `bson:"createdat"`
	}

	var result []map[string]interface{}
	for custCursor.Next(ctx()) {
		var cust customerFinance
		if custCursor.Decode(&cust) != nil {
			continue
		}

		// Get all plans for this customer
		planCursor, err := db.Collection("installment_plans").Find(ctx(), bson.M{
			"customerid": cust.ID,
			"status": bson.M{"$in": []string{"active", "Active", "Open"}},
		})
		if err != nil {
			// Customer with no plans - still include with 0 balance
			result = append(result, map[string]interface{}{
				"customer_id":    cust.ID,
				"name":           cust.Name,
				"customer_name":  cust.Name,
				"name_urdu":      cust.NameUrdu,
				"father_name":    cust.FatherName,
				"phone":          cust.Phone,
				"cnic":           cust.CNIC,
				"address":        cust.Address,
				"address_urdu":   cust.AddressUrdu,
				"total_amount":   0.0,
				"pending_amount": 0.0,
				"remaining":      0.0,
				"created_at":     cust.CreatedAt.Format("2006-01-02"),
			})
			continue
		}

		totalAmount := 0.0
		totalRemaining := 0.0
		for planCursor.Next(ctx()) {
			var plan domain.InstallmentPlan
			if planCursor.Decode(&plan) != nil {
				continue
			}

			totalAmount += plan.TotalAmount

			// Calculate total paid on this plan
			// NOTE: Down payment is already in payments collection, so don't add plan.DownPayment separately
			totalPaid := 0.0
			payCur, _ := db.Collection("payments").Find(ctx(), bson.M{
				"$or": []interface{}{
					bson.M{"installmentplanid": plan.ID},
					bson.M{"installmentPlanId": plan.ID},
				},
			})
			if payCur != nil {
				for payCur.Next(ctx()) {
					var pay domain.Payment
					if payCur.Decode(&pay) == nil {
						totalPaid += pay.Amount
					}
				}
				payCur.Close(ctx())
			}

			remaining := plan.TotalAmount - totalPaid
			if remaining < 0 {
				remaining = 0
			}
			totalRemaining += remaining
		}
		planCursor.Close(ctx())

		result = append(result, map[string]interface{}{
			"customer_id":    cust.ID,
			"name":           cust.Name,
			"customer_name":  cust.Name,
			"name_urdu":      cust.NameUrdu,
			"father_name":    cust.FatherName,
			"phone":          cust.Phone,
			"cnic":           cust.CNIC,
			"address":        cust.Address,
			"address_urdu":   cust.AddressUrdu,
			"total_amount":   totalAmount,
			"pending_amount": totalRemaining,
			"remaining":      totalRemaining,
			"created_at":     cust.CreatedAt.Format("2006-01-02"),
		})
	}

	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
}