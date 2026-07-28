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

	// PIPELINE 4: Total profit - optimized with aggregation
	totalProfit := 0.0
	profitPipe := mongo.Pipeline{
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "installment_plans"}, {Key: "localField", Value: "installmentplanid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "plan"}}}},
		{{Key: "$unwind", Value: bson.D{{Key: "path", Value: "$plan"}, {Key: "preserveNullAndEmptyArrays", Value: true}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "products"}, {Key: "localField", Value: "plan.productid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "product"}}}},
		{{Key: "$unwind", Value: bson.D{{Key: "path", Value: "$product"}, {Key: "preserveNullAndEmptyArrays", Value: true}}}},
		{{Key: "$group", Value: bson.D{{Key: "_id", Value: nil}, {Key: "totalProfit", Value: bson.D{{Key: "$sum", Value: bson.D{{Key: "$cond", Value: []interface{}{
			bson.D{{Key: "$gt", Value: []interface{}{"$product.purchaseprice", 0}}},
			bson.D{{Key: "$subtract", Value: []interface{}{"$amount", "$product.purchaseprice"}}},
			"$amount",
		}}}}}}}}},
	}
	profitCur, err := db.Collection("payments").Aggregate(ctx(), profitPipe)
	if err == nil {
		if profitCur.Next(ctx()) {
			var res struct {
				TotalProfit float64 `bson:"totalProfit"`
			}
			if profitCur.Decode(&res) == nil {
				totalProfit = res.TotalProfit
			}
		}
		profitCur.Close(ctx())
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
	// PENDING CALCULATION: Single aggregation with $lookup (was N+1 queries)
	// SPEED FIX: Replaced per-plan queries with a single pipeline
	// ─────────────────────────────────────────────────────────────
	pendingTotal := 0.0
	pendingCustomersCount := 0
	pendingCustSet := make(map[string]bool)

	pendingPipe := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "status", Value: bson.M{"$in": []string{"active", "Active", "Open"}}}}}},
		{{Key: "$lookup", Value: bson.D{
			{Key: "from", Value: "payments"},
			{Key: "let", Value: bson.D{{Key: "planId", Value: "$_id"}}},
			{Key: "pipeline", Value: mongo.Pipeline{
				{{Key: "$match", Value: bson.D{
					{Key: "$expr", Value: bson.D{
						{Key: "$or", Value: []bson.D{
							{{Key: "$eq", Value: []interface{}{"$installmentplanid", "$$planId"}}},
							{{Key: "$eq", Value: []interface{}{"$installmentPlanId", "$$planId"}}},
						}},
					}},
				}}},
				{{Key: "$group", Value: bson.D{
					{Key: "_id", Value: nil},
					{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
				}}},
			}},
			{Key: "as", Value: "paymentSummary"},
		}}},
	}
	type pendingPlanResult struct {
		ID             string `bson:"_id"`
		CustomerID     string `bson:"customerid"`
		TotalAmount    float64 `bson:"totalamount"`
		PaymentSummary []struct {
			Total float64 `bson:"total"`
		} `bson:"paymentSummary"`
	}
	pendingCur, err := db.Collection("installment_plans").Aggregate(ctx(), pendingPipe)
	if err == nil {
		for pendingCur.Next(ctx()) {
			var pr pendingPlanResult
			if pendingCur.Decode(&pr) != nil {
				continue
			}
			totalPaid := 0.0
			if len(pr.PaymentSummary) > 0 {
				totalPaid = pr.PaymentSummary[0].Total
			}
			planRemaining := pr.TotalAmount - totalPaid
			if planRemaining < 0 {
				planRemaining = 0
			}
			if planRemaining > 0 {
				pendingTotal += planRemaining
				if !pendingCustSet[pr.CustomerID] {
					pendingCustSet[pr.CustomerID] = true
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

	// Due Today + Overdue count: all unpaid installments due today or earlier
	todayDueCount := int64(0)
	todayDuePipe := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "status", Value: bson.M{"$in": []string{"active", "Active", "Open"}}}}}},
		{{Key: "$unwind", Value: "$installments"}},
		{{Key: "$match", Value: bson.D{{Key: "installments.paid", Value: false}, {Key: "installments.due_date", Value: bson.D{{Key: "$lt", Value: todayEnd}}}}}},
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

	// Total products (unique names) & low stock (grouped)
	totalProducts := int64(0)
	lowStock := int64(0)
	inventoryValue := 0.0

	type ProductGroup struct {
		Name        string  `json:"name" bson:"_id"`
		NameUrdu    string  `json:"nameUrdu" bson:"nameurdu"`
		Company     string  `json:"company" bson:"company"`
		Category    string  `json:"category" bson:"category"`
		TotalStock  int     `json:"totalStock" bson:"totalstock"`
		AvgPrice    float64 `json:"avgPrice" bson:"avgprice"`
		TotalValue  float64 `json:"totalValue" bson:"totalvalue"`
		VariantCount int    `json:"variantCount" bson:"variantcount"`
	}

	// Aggregate products by name to get unique items + stock sums
	groupPipe := mongo.Pipeline{
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: bson.D{{Key: "$toLower", Value: "$name"}}},
			{Key: "name", Value: bson.D{{Key: "$first", Value: "$name"}}},
			{Key: "nameurdu", Value: bson.D{{Key: "$first", Value: "$nameurdu"}}},
			{Key: "company", Value: bson.D{{Key: "$first", Value: bson.D{{Key: "$ifNull", Value: []interface{}{"$company", ""}}}}}},
			{Key: "category", Value: bson.D{{Key: "$first", Value: "$category"}}},
			{Key: "totalstock", Value: bson.D{{Key: "$sum", Value: bson.D{{Key: "$cond", Value: []interface{}{bson.D{{Key: "$gt", Value: []interface{}{"$stockcount", 0}}}, "$stockcount", 0}}}}}},
			{Key: "totalvalue", Value: bson.D{{Key: "$sum", Value: bson.D{{Key: "$multiply", Value: []interface{}{"$stockcount", bson.D{{Key: "$cond", Value: []interface{}{bson.D{{Key: "$gt", Value: []interface{}{"$price", 0}}}, "$price", bson.D{{Key: "$multiply", Value: []interface{}{"$purchaseprice", 1.2}}}}}}}}}}}},
			{Key: "avgprice", Value: bson.D{{Key: "$avg", Value: bson.D{{Key: "$cond", Value: []interface{}{bson.D{{Key: "$gt", Value: []interface{}{"$price", 0}}}, "$price", bson.D{{Key: "$multiply", Value: []interface{}{"$purchaseprice", 1.2}}}}}}}}},
			{Key: "variantcount", Value: bson.D{{Key: "$sum", Value: 1}}},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "name", Value: 1}}}},
	}
	groupCursor, groupErr := db.Collection("products").Aggregate(ctx(), groupPipe)
	var productGroups []ProductGroup
	if groupErr == nil {
		for groupCursor.Next(ctx()) {
			var pg ProductGroup
			if groupCursor.Decode(&pg) == nil {
				productGroups = append(productGroups, pg)
				totalProducts++
				if pg.TotalStock <= 5 {
					lowStock++
				}
				inventoryValue += pg.TotalValue
			}
		}
		groupCursor.Close(ctx())
	}
	if productGroups == nil {
		productGroups = []ProductGroup{}
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
		"inventoryValue":    inventoryValue,
		"monthlyDueCount":   monthlyDueCount,
		"productGroups":     productGroups,
		"ageingInventory":   0,  // placeholder — can be calculated later
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
		// Count installment payments for accurate paid_count
		installmentPayments := 0
		for _, pay := range plan.Payments {
			if pay.InstallmentNo > 0 {
				installmentPayments++
			}
		}
		if installmentPayments > paidCount {
			paidCount = installmentPayments
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
				"paid_amount": totalPaidOnPlan,
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

	_, todayEnd := todayRange()
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
			if d.Paid || !d.DueDate.Before(todayEnd) {
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
				"category": prod.Category, "company": prod.Company,
				"price": prod.Price, "purchase_price": prod.PurchasePrice,
				"stock_count": prod.StockCount,
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
			"total_due_count": 0, "collected_count": 0, "remaining_count": 0,
			"total_due_amount": 0, "collected_amount": 0, "remaining_amount": 0,
			"collected_customers": []interface{}{}, "remaining_customers": []interface{}{},
		})
		return
	}

	todayStart, todayEnd := todayRange()

	var collectedEntries []map[string]interface{}
	var remainingEntries []map[string]interface{}
	totalCollectedAmt := 0.0
	totalRemainingAmt := 0.0

	// ── COLLECTED TODAY: Payments with $lookup (was N+1 queries) ──
	type collectedResult struct {
		Amount             float64 `bson:"amount"`
		InstallmentNo      int     `bson:"installmentno"`
		TransactionDate    time.Time `bson:"transactiondate"`
		PlanID             string  `bson:"_id"`
		CustomerID         string  `bson:"customerid"`
		ProductID          string  `bson:"productid"`
		NumberOfInstallments int   `bson:"numinstallments"`
		Installments       []domain.InstallmentDetail `bson:"installments"`
		Customer           []struct {
			ID       string `bson:"_id"`
			Name     string `bson:"name"`
			NameUrdu string `bson:"nameurdu"`
			FatherName string `bson:"fathername"`
			Phone    string `bson:"phone"`
		} `bson:"customer"`
		Product            []struct {
			Name string `bson:"name"`
		} `bson:"product"`
	}

	collectedPipe := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{
			{Key: "$or", Value: []bson.D{
				{{Key: "transactiondate", Value: bson.D{{Key: "$gte", Value: todayStart}, {Key: "$lt", Value: todayEnd}}}},
				{{Key: "transactionDate", Value: bson.D{{Key: "$gte", Value: todayStart}, {Key: "$lt", Value: todayEnd}}}},
			}},
			{Key: "installmentno", Value: bson.D{{Key: "$gt", Value: 0}}},
		}}},
		{{Key: "$lookup", Value: bson.D{
			{Key: "from", Value: "installment_plans"},
			{Key: "let", Value: bson.D{{Key: "pid", Value: "$installmentplanid"}}},
			{Key: "pipeline", Value: mongo.Pipeline{
				{{Key: "$match", Value: bson.D{{Key: "$expr", Value: bson.D{{Key: "$or", Value: []bson.D{
					{{Key: "$eq", Value: []interface{}{"$_id", "$$pid"}}},
					{{Key: "$eq", Value: []interface{}{bson.D{{Key: "$toString", Value: "$_id"}}, "$$pid"}}},
				}}}}}}},
			}},
			{Key: "as", Value: "plan"},
		}}},
		{{Key: "$unwind", Value: bson.D{{Key: "path", Value: "$plan"}, {Key: "preserveNullAndEmptyArrays", Value: true}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "customers"}, {Key: "localField", Value: "plan.customerid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "customer"}}}},
		{{Key: "$unwind", Value: bson.D{{Key: "path", Value: "$customer"}, {Key: "preserveNullAndEmptyArrays", Value: true}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "products"}, {Key: "localField", Value: "plan.productid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "product"}}}},
		{{Key: "$unwind", Value: bson.D{{Key: "path", Value: "$product"}, {Key: "preserveNullAndEmptyArrays", Value: true}}}},
	}
	colCur, err := db.Collection("payments").Aggregate(ctx(), collectedPipe)
	if err == nil {
		for colCur.Next(ctx()) {
			var item struct {
				Amount          float64 `bson:"amount"`
				InstallmentNo   int     `bson:"installmentno"`
				TransactionDate time.Time `bson:"transactiondate"`
				Plan            struct {
					ID                   string               `bson:"_id"`
					CustomerID           string               `bson:"customerid"`
					ProductID            string               `bson:"productid"`
					NumberOfInstallments int                  `bson:"numinstallments"`
					Installments         []domain.InstallmentDetail `bson:"installments"`
				} `bson:"plan"`
				Customer struct {
					Name     string `bson:"name"`
					NameUrdu string `bson:"nameurdu"`
					FatherName string `bson:"fathername"`
					Phone    string `bson:"phone"`
				} `bson:"customer"`
				Product struct {
					Name string `bson:"name"`
				} `bson:"product"`
			}
			if colCur.Decode(&item) != nil {
				continue
			}
			dueDate := item.TransactionDate.Format("2006-01-02")
			for _, d := range item.Plan.Installments {
				if d.InstallmentNo == item.InstallmentNo {
					dueDate = d.DueDate.Format("2006-01-02")
					break
				}
			}
			totalCollectedAmt += item.Amount
			collectedEntries = append(collectedEntries, map[string]interface{}{
				"plan_id": item.Plan.ID, "customer_id": item.Plan.CustomerID,
				"customer_name": item.Customer.Name, "customer_urdu": item.Customer.NameUrdu,
				"father_name": item.Customer.FatherName, "phone": item.Customer.Phone,
				"product_name": item.Product.Name, "installment_no": item.InstallmentNo,
				"total_installments": item.Plan.NumberOfInstallments,
				"due_date": dueDate, "amount": item.Amount,
				"date": item.TransactionDate.Format("2006-01-02"),
				"status": "collected",
			})
		}
		colCur.Close(ctx())
	}
	if collectedEntries == nil {
		collectedEntries = []map[string]interface{}{}
	}

	// ── REMAINING: Unpaid installments due today or earlier ──
	remainingPipe := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "status", Value: bson.M{"$in": []string{"active", "Active", "Open"}}}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "customers"}, {Key: "localField", Value: "customerid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "customer"}}}},
		{{Key: "$lookup", Value: bson.D{{Key: "from", Value: "products"}, {Key: "localField", Value: "productid"}, {Key: "foreignField", Value: "_id"}, {Key: "as", Value: "product"}}}},
	}
	remCur, err := db.Collection("installment_plans").Aggregate(ctx(), remainingPipe)
	if err == nil {
		for remCur.Next(ctx()) {
			var plan struct {
				ID                   string               `bson:"_id"`
				CustomerID           string               `bson:"customerid"`
				ProductID            string               `bson:"productid"`
				NumberOfInstallments int                  `bson:"numinstallments"`
				Installments         []domain.InstallmentDetail `bson:"installments"`
				Customer             []struct {
					Name     string `bson:"name"`
					NameUrdu string `bson:"nameurdu"`
					FatherName string `bson:"fathername"`
					Phone    string `bson:"phone"`
				} `bson:"customer"`
				Product              []struct {
					Name string `bson:"name"`
				} `bson:"product"`
			}
			if remCur.Decode(&plan) != nil || len(plan.Customer) == 0 {
				continue
			}
			cust := plan.Customer[0]
			prodName := ""
			if len(plan.Product) > 0 {
				prodName = plan.Product[0].Name
			}
			for _, d := range plan.Installments {
				if d.Paid || !d.DueDate.Before(todayEnd) {
					continue
				}
				isOverdue := d.DueDate.Before(todayStart)
				status := "pending"
				if isOverdue {
					status = "overdue"
				}
				totalRemainingAmt += d.Amount
				remainingEntries = append(remainingEntries, map[string]interface{}{
					"plan_id": plan.ID, "customer_id": plan.CustomerID,
					"customer_name": cust.Name, "customer_urdu": cust.NameUrdu,
					"father_name": cust.FatherName, "phone": cust.Phone,
					"product_name": prodName, "installment_no": d.InstallmentNo,
					"total_installments": plan.NumberOfInstallments,
					"due_date": d.DueDate.Format("2006-01-02"),
					"amount": d.Amount, "fine": d.Fine,
					"date": d.DueDate.Format("2006-01-02"),
					"status": status,
				})
			}
		}
		remCur.Close(ctx())
	}
	if remainingEntries == nil {
		remainingEntries = []map[string]interface{}{}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"total_due_count":    len(collectedEntries) + len(remainingEntries),
		"collected_count":    len(collectedEntries),
		"remaining_count":    len(remainingEntries),
		"total_due_amount":   totalCollectedAmt + totalRemainingAmt,
		"collected_amount":   totalCollectedAmt,
		"remaining_amount":   totalRemainingAmt,
		"collected_customers": collectedEntries,
		"remaining_customers": remainingEntries,
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
		// Count installment payments (exclude down payment = installment_no 0)
		installmentPayments := 0
		for _, pay := range plan.Payments {
			if pay.InstallmentNo > 0 {
				installmentPayments++
			}
		}
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
			"paid_amount": totalPaidOnPlan, "paid": true,
			"remaining": planRemaining, "created_at": plan.CreatedAt.Format("2006-01-02"),
			"status": "completed",
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