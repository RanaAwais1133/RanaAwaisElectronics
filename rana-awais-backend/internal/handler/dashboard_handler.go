package handler

import (
	"net/http"
	"sync"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type DashboardHandler struct{}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{}
}

func (h *DashboardHandler) Summary(w http.ResponseWriter, r *http.Request) {
	db := config.MongoDatabase
	if db == nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"todayCollection":       map[string]interface{}{"total": 0.0, "count": 0},
			"todayRevenue":          0.0,
			"todayProfit":           0.0,
			"monthRevenue":          0.0,
			"monthProfit":           0.0,
			"totalPending":          0.0,
			"pendingCustomers":      int64(0),
			"pendingTotal":          0.0,
			"totalPaid":             0.0,
			"totalCustomers":        int64(0),
			"activeInstallments":    int64(0),
			"completedInstallments": int64(0),
			"totalProducts":         int64(0),
			"lowStock":              int64(0),
			"inventoryValue":        0.0,
			"ageingInventory":       int64(0),
			"overdueCount":          int64(0),
			"todayDueCount":         int64(0),
			"monthlyDueCount":       int64(0),
		})
		return
	}

	ctx := r.Context()
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	todayEnd := todayStart.Add(24 * time.Hour)
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	monthEnd := monthStart.AddDate(0, 1, 0)

	type result struct {
		key   string
		value interface{}
	}

	var wg sync.WaitGroup
	results := make(chan result, 25)

	// 1. Today's Collection
	wg.Add(1)
	go func() {
		defer wg.Done()
		pipeline := mongo.Pipeline{
			bson.D{{Key: "$match", Value: bson.D{
				{Key: "transactiondate", Value: bson.D{
					{Key: "$gte", Value: todayStart},
					{Key: "$lt", Value: todayEnd},
				}},
			}}},
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
				{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
			}}},
		}
		cursor, err := db.Collection("payments").Aggregate(ctx, pipeline)
		if err != nil {
			results <- result{"todayCollection", map[string]interface{}{"total": 0.0, "count": 0}}
			return
		}
		defer cursor.Close(ctx)

		var total float64
		var count int64
		if cursor.Next(ctx) {
			var r struct {
				Total float64 `bson:"total"`
				Count int64   `bson:"count"`
			}
			if cursor.Decode(&r) == nil {
				total = r.Total
				count = r.Count
			}
		}

		// Down payments today
		downPipeline := mongo.Pipeline{
			bson.D{{Key: "$match", Value: bson.D{
				{Key: "createdat", Value: bson.D{
					{Key: "$gte", Value: todayStart},
					{Key: "$lt", Value: todayEnd},
				}},
				{Key: "downpayment", Value: bson.D{{Key: "$gt", Value: 0}}},
			}}},
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "total", Value: bson.D{{Key: "$sum", Value: "$downpayment"}}},
				{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
			}}},
		}
		downCursor, err := db.Collection("installment_plans").Aggregate(ctx, downPipeline)
		if err == nil {
			defer downCursor.Close(ctx)
			if downCursor.Next(ctx) {
				var r struct {
					Total float64 `bson:"total"`
					Count int64   `bson:"count"`
				}
				if downCursor.Decode(&r) == nil {
					total += r.Total
					count += r.Count
				}
			}
		}

		results <- result{"todayCollection", map[string]interface{}{"total": total, "count": count}}
	}()

	// 2 & 3. Today Revenue & Profit
	wg.Add(1)
	go func() {
		defer wg.Done()
		var revenue, profit float64

		payPipeline := mongo.Pipeline{
			bson.D{{Key: "$match", Value: bson.D{
				{Key: "transactiondate", Value: bson.D{
					{Key: "$gte", Value: todayStart},
					{Key: "$lt", Value: todayEnd},
				}},
			}}},
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
			}}},
		}
		payCursor, _ := db.Collection("payments").Aggregate(ctx, payPipeline)
		if payCursor != nil {
			if payCursor.Next(ctx) {
				var r struct{ Total float64 `bson:"total"` }
				if payCursor.Decode(&r) == nil {
					revenue = r.Total
				}
			}
			payCursor.Close(ctx)
		}

		downPipeline := mongo.Pipeline{
			bson.D{{Key: "$match", Value: bson.D{
				{Key: "createdat", Value: bson.D{
					{Key: "$gte", Value: todayStart},
					{Key: "$lt", Value: todayEnd},
				}},
				{Key: "downpayment", Value: bson.D{{Key: "$gt", Value: 0}}},
			}}},
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "total", Value: bson.D{{Key: "$sum", Value: "$downpayment"}}},
			}}},
		}
		downCursor, _ := db.Collection("installment_plans").Aggregate(ctx, downPipeline)
		if downCursor != nil {
			if downCursor.Next(ctx) {
				var r struct{ Total float64 `bson:"total"` }
				if downCursor.Decode(&r) == nil {
					revenue += r.Total
				}
			}
			downCursor.Close(ctx)
		}

		expPipeline := mongo.Pipeline{
			bson.D{{Key: "$match", Value: bson.D{
				{Key: "type", Value: "expense"},
				{Key: "date", Value: bson.D{
					{Key: "$gte", Value: todayStart},
					{Key: "$lt", Value: todayEnd},
				}},
			}}},
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
			}}},
		}
		expCursor, _ := db.Collection("accounting_entries").Aggregate(ctx, expPipeline)
		if expCursor != nil {
			if expCursor.Next(ctx) {
				var r struct{ Total float64 `bson:"total"` }
				if expCursor.Decode(&r) == nil {
					profit = revenue - r.Total
				}
			}
			expCursor.Close(ctx)
		} else {
			profit = revenue
		}

		results <- result{"todayRevenue", revenue}
		results <- result{"todayProfit", profit}
	}()

	// 4 & 5. Month Revenue & Profit
	wg.Add(1)
	go func() {
		defer wg.Done()
		var revenue, profit float64

		payPipeline := mongo.Pipeline{
			bson.D{{Key: "$match", Value: bson.D{
				{Key: "transactiondate", Value: bson.D{
					{Key: "$gte", Value: monthStart},
					{Key: "$lt", Value: monthEnd},
				}},
			}}},
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
			}}},
		}
		payCursor, _ := db.Collection("payments").Aggregate(ctx, payPipeline)
		if payCursor != nil {
			if payCursor.Next(ctx) {
				var r struct{ Total float64 `bson:"total"` }
				if payCursor.Decode(&r) == nil {
					revenue = r.Total
				}
			}
			payCursor.Close(ctx)
		}

		downPipeline := mongo.Pipeline{
			bson.D{{Key: "$match", Value: bson.D{
				{Key: "createdat", Value: bson.D{
					{Key: "$gte", Value: monthStart},
					{Key: "$lt", Value: monthEnd},
				}},
				{Key: "downpayment", Value: bson.D{{Key: "$gt", Value: 0}}},
			}}},
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "total", Value: bson.D{{Key: "$sum", Value: "$downpayment"}}},
			}}},
		}
		downCursor, _ := db.Collection("installment_plans").Aggregate(ctx, downPipeline)
		if downCursor != nil {
			if downCursor.Next(ctx) {
				var r struct{ Total float64 `bson:"total"` }
				if downCursor.Decode(&r) == nil {
					revenue += r.Total
				}
			}
			downCursor.Close(ctx)
		}

		expPipeline := mongo.Pipeline{
			bson.D{{Key: "$match", Value: bson.D{
				{Key: "type", Value: "expense"},
				{Key: "date", Value: bson.D{
					{Key: "$gte", Value: monthStart},
					{Key: "$lt", Value: monthEnd},
				}},
			}}},
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
			}}},
		}
		expCursor, _ := db.Collection("accounting_entries").Aggregate(ctx, expPipeline)
		if expCursor != nil {
			if expCursor.Next(ctx) {
				var r struct{ Total float64 `bson:"total"` }
				if expCursor.Decode(&r) == nil {
					profit = revenue - r.Total
				}
			}
			expCursor.Close(ctx)
		} else {
			profit = revenue
		}

		results <- result{"monthRevenue", revenue}
		results <- result{"monthProfit", profit}
	}()

	// 6. Total Pending
	wg.Add(1)
	go func() {
		defer wg.Done()
		var total float64
		cursor, err := db.Collection("installment_plans").Find(ctx, bson.M{"status": "active"})
		if err == nil {
			defer cursor.Close(ctx)
			for cursor.Next(ctx) {
				var plan domain.InstallmentPlan
				if cursor.Decode(&plan) == nil {
					for _, d := range plan.Installments {
						if !d.Paid {
							total += d.Amount + d.Fine - d.PartialPaid
						}
					}
				}
			}
		}
		results <- result{"totalPending", total}
	}()

	// 6b. Pending Customers Count
	wg.Add(1)
	go func() {
		defer wg.Done()
		custMap := make(map[string]bool)
		cursor, err := db.Collection("installment_plans").Find(ctx, bson.M{"status": "active"})
		if err == nil {
			defer cursor.Close(ctx)
			for cursor.Next(ctx) {
				var plan domain.InstallmentPlan
				if cursor.Decode(&plan) == nil {
					for _, d := range plan.Installments {
						if !d.Paid {
							custMap[plan.CustomerID] = true
							break
						}
					}
				}
			}
		}
		results <- result{"pendingCustomers", int64(len(custMap))}
	}()

	// 6c. Pending Total Amount
	wg.Add(1)
	go func() {
		defer wg.Done()
		var total float64
		cursor, err := db.Collection("installment_plans").Find(ctx, bson.M{"status": "active"})
		if err == nil {
			defer cursor.Close(ctx)
			for cursor.Next(ctx) {
				var plan domain.InstallmentPlan
				if cursor.Decode(&plan) == nil {
					for _, d := range plan.Installments {
						if !d.Paid {
							total += d.Amount + d.Fine - d.PartialPaid
						}
					}
				}
			}
		}
		results <- result{"pendingTotal", total}
	}()

	// 7. Total Paid
	wg.Add(1)
	go func() {
		defer wg.Done()
		pipeline := mongo.Pipeline{
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
			}}},
		}
		var total float64
		cursor, err := db.Collection("payments").Aggregate(ctx, pipeline)
		if err == nil {
			defer cursor.Close(ctx)
			if cursor.Next(ctx) {
				var r struct{ Total float64 `bson:"total"` }
				if cursor.Decode(&r) == nil {
					total = r.Total
				}
			}
		}
		results <- result{"totalPaid", total}
	}()

	// 8. Total Customers
	wg.Add(1)
	go func() {
		defer wg.Done()
		count, _ := db.Collection("customers").CountDocuments(ctx, bson.M{})
		results <- result{"totalCustomers", count}
	}()

	// 9. Active Installments
	wg.Add(1)
	go func() {
		defer wg.Done()
		count, _ := db.Collection("installment_plans").CountDocuments(ctx, bson.M{"status": "active"})
		results <- result{"activeInstallments", count}
	}()

	// 10. Completed Installments
	wg.Add(1)
	go func() {
		defer wg.Done()
		count, _ := db.Collection("installment_plans").CountDocuments(ctx, bson.M{"status": "completed"})
		results <- result{"completedInstallments", count}
	}()

	// 11. Total Products
	wg.Add(1)
	go func() {
		defer wg.Done()
		count, _ := db.Collection("products").CountDocuments(ctx, bson.M{})
		results <- result{"totalProducts", count}
	}()

	// 12. Low Stock Items
	wg.Add(1)
	go func() {
		defer wg.Done()
		count, _ := db.Collection("products").CountDocuments(ctx, bson.M{
			"instock":    true,
			"stockcount": bson.M{"$lte": 5},
		})
		results <- result{"lowStock", count}
	}()

	// 13. Inventory Value
	wg.Add(1)
	go func() {
		defer wg.Done()
		pipeline := mongo.Pipeline{
			bson.D{{Key: "$match", Value: bson.D{
				{Key: "status", Value: "in_stock"},
			}}},
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "total", Value: bson.D{{Key: "$sum", Value: bson.D{
					{Key: "$multiply", Value: bson.A{"$purchaseprice", bson.D{{Key: "$ifNull", Value: bson.A{"$quantity", 1}}}}},
				}}}},
			}}},
		}
		var value float64
		cursor, err := db.Collection("inventory_items").Aggregate(ctx, pipeline)
		if err == nil {
			defer cursor.Close(ctx)
			if cursor.Next(ctx) {
				var r struct{ Total float64 `bson:"total"` }
				if cursor.Decode(&r) == nil {
					value = r.Total
				}
			}
		}
		results <- result{"inventoryValue", value}
	}()

	// 14. Ageing Inventory
	wg.Add(1)
	go func() {
		defer wg.Done()
		cutoff := now.AddDate(0, 0, -90)
		count, _ := db.Collection("inventory_items").CountDocuments(ctx, bson.M{
			"createdat": bson.M{"$lte": cutoff},
			"status":    "in_stock",
		})
		results <- result{"ageingInventory", count}
	}()

	// 15. Overdue Installments count
	wg.Add(1)
	go func() {
		defer wg.Done()
		var count int64
		cursor, err := db.Collection("installment_plans").Find(ctx, bson.M{"status": "active"})
		if err == nil {
			defer cursor.Close(ctx)
			for cursor.Next(ctx) {
				var plan domain.InstallmentPlan
				if cursor.Decode(&plan) == nil {
					for _, d := range plan.Installments {
						if !d.Paid && d.DueDate.Before(todayStart) {
							count++
						}
					}
				}
			}
		}
		results <- result{"overdueCount", count}
	}()

	// 16. Today Due count
	wg.Add(1)
	go func() {
		defer wg.Done()
		var count int64
		cursor, err := db.Collection("installment_plans").Find(ctx, bson.M{"status": "active"})
		if err == nil {
			defer cursor.Close(ctx)
			for cursor.Next(ctx) {
				var plan domain.InstallmentPlan
				if cursor.Decode(&plan) == nil {
					for _, d := range plan.Installments {
						if !d.Paid && (d.DueDate.Equal(todayStart) || (d.DueDate.After(todayStart) && d.DueDate.Before(todayEnd))) {
							count++
						}
					}
				}
			}
		}
		results <- result{"todayDueCount", count}
	}()

	// 17. Monthly Due count
	wg.Add(1)
	go func() {
		defer wg.Done()
		var count int64
		cursor, err := db.Collection("installment_plans").Find(ctx, bson.M{"status": "active"})
		if err == nil {
			defer cursor.Close(ctx)
			for cursor.Next(ctx) {
				var plan domain.InstallmentPlan
				if cursor.Decode(&plan) == nil {
					for _, d := range plan.Installments {
						if !d.Paid && (d.DueDate.Equal(monthStart) || (d.DueDate.After(monthStart) && d.DueDate.Before(monthEnd))) {
							count++
						}
					}
				}
			}
		}
		results <- result{"monthlyDueCount", count}
	}()

	go func() { wg.Wait(); close(results) }()

	summary := make(map[string]interface{})
	fields := []string{"todayCollection", "todayRevenue", "todayProfit", "monthRevenue", "monthProfit",
		"totalPending", "pendingCustomers", "pendingTotal", "totalPaid", "totalCustomers", "activeInstallments", "completedInstallments",
		"totalProducts", "lowStock", "inventoryValue", "ageingInventory", "overdueCount", "todayDueCount", "monthlyDueCount"}
	for _, f := range fields {
		switch f {
		case "todayCollection":
			summary[f] = map[string]interface{}{"total": 0.0, "count": 0}
		case "todayRevenue", "todayProfit", "totalPending", "pendingTotal", "totalPaid", "inventoryValue":
			summary[f] = 0.0
		default:
			summary[f] = int64(0)
		}
	}
	for res := range results {
		summary[res.key] = res.value
	}

	respondJSON(w, http.StatusOK, summary)
}

func (h *DashboardHandler) TodayInstallments(w http.ResponseWriter, r *http.Request) {
	db := config.MongoDatabase
	if db == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	end := start.Add(24 * time.Hour)

	cursor, err := db.Collection("installment_plans").Find(r.Context(), bson.M{"status": "active"})
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch", "ناکام")
		return
	}
	defer cursor.Close(r.Context())

	var result []map[string]interface{}
	for cursor.Next(r.Context()) {
		var plan domain.InstallmentPlan
		if err := cursor.Decode(&plan); err != nil {
			continue
		}

		var cust domain.Customer
		if err := db.Collection("customers").FindOne(r.Context(), bson.M{"_id": plan.CustomerID}).Decode(&cust); err != nil {
			continue
		}

		var prodName, prodNameUrdu string
		if plan.ProductID != "" {
			var prod domain.Product
			if err := db.Collection("products").FindOne(r.Context(), bson.M{"_id": plan.ProductID}).Decode(&prod); err == nil {
				prodName = prod.Name
				prodNameUrdu = prod.NameUrdu
			}
		}

		for _, d := range plan.Installments {
			if d.Paid {
				continue
			}
			if d.DueDate.Before(start) || d.DueDate.After(end) || d.DueDate.Equal(end) {
				continue
			}

			item := map[string]interface{}{
				"id": plan.ID, "customer_name": cust.Name, "customer_urdu": cust.NameUrdu,
				"father_name": cust.FatherName, "phone": cust.Phone,
				"product_name": prodName, "product_name_urdu": prodNameUrdu,
				"installment_no": d.InstallmentNo, "due_date": d.DueDate.Format("2006-01-02"),
				"amount": d.Amount, "paid": d.Paid, "partial_paid": d.PartialPaid,
				"remaining": d.Remaining, "collected_by": d.CollectedBy,
				"total_amount": plan.TotalAmount, "down_payment": plan.DownPayment,
				"remaining_amount": plan.RemainingAmount, "num_installments": plan.NumberOfInstallments,
			}
			if d.PaidDate != nil {
				item["paid_date"] = d.PaidDate.Format("2006-01-02")
			}
			result = append(result, item)
		}
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
}

func (h *DashboardHandler) OverdueDetails(w http.ResponseWriter, r *http.Request) {
	db := config.MongoDatabase
	if db == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	cursor, err := db.Collection("installment_plans").Find(r.Context(), bson.M{"status": "active"})
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch overdue", "ناکام")
		return
	}
	defer cursor.Close(r.Context())

	var result []map[string]interface{}
	for cursor.Next(r.Context()) {
		var plan domain.InstallmentPlan
		if err := cursor.Decode(&plan); err != nil {
			continue
		}

		var cust domain.Customer
		if err := db.Collection("customers").FindOne(r.Context(), bson.M{"_id": plan.CustomerID}).Decode(&cust); err != nil {
			continue
		}

		var prodName, prodNameUrdu string
		if plan.ProductID != "" {
			var prod domain.Product
			if err := db.Collection("products").FindOne(r.Context(), bson.M{"_id": plan.ProductID}).Decode(&prod); err == nil {
				prodName = prod.Name
				prodNameUrdu = prod.NameUrdu
			}
		}

		for _, d := range plan.Installments {
			if d.Paid {
				continue
			}
			if !d.DueDate.Before(today) {
				continue
			}

			result = append(result, map[string]interface{}{
				"id": plan.ID, "customer_name": cust.Name, "customer_urdu": cust.NameUrdu,
				"father_name": cust.FatherName, "phone": cust.Phone,
				"product_name": prodName, "product_name_urdu": prodNameUrdu,
				"installment_no": d.InstallmentNo, "due_date": d.DueDate.Format("2006-01-02"),
				"amount": d.Amount, "paid": d.Paid, "partial_paid": d.PartialPaid,
				"remaining": d.Remaining, "collected_by": d.CollectedBy, "fine": d.Fine,
				"total_amount": plan.TotalAmount, "remaining_amount": plan.RemainingAmount,
			})
		}
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
}

func (h *DashboardHandler) TodayDueDetails(w http.ResponseWriter, r *http.Request) {
	h.TodayInstallments(w, r)
}

func (h *DashboardHandler) LowStockDetails(w http.ResponseWriter, r *http.Request) {
	db := config.MongoDatabase
	if db == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	cursor, err := db.Collection("products").Find(r.Context(), bson.M{
		"instock":    true,
		"stockcount": bson.M{"$lte": 5},
	})
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch", "ناکام")
		return
	}
	defer cursor.Close(r.Context())

	var result []map[string]interface{}
	for cursor.Next(r.Context()) {
		var prod domain.Product
		if cursor.Decode(&prod) == nil {
			result = append(result, map[string]interface{}{
				"id": prod.ID, "name": prod.Name, "name_urdu": prod.NameUrdu,
				"stock_count": prod.StockCount, "price": prod.Price, "purchase_price": prod.PurchasePrice,
			})
		}
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
}

func (h *DashboardHandler) MonthlyDueDetails(w http.ResponseWriter, r *http.Request) {
	db := config.MongoDatabase
	if db == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	end := start.AddDate(0, 1, 0)

	cursor, err := db.Collection("installment_plans").Find(r.Context(), bson.M{"status": "active"})
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch", "ناکام")
		return
	}
	defer cursor.Close(r.Context())

	var result []map[string]interface{}
	for cursor.Next(r.Context()) {
		var plan domain.InstallmentPlan
		if err := cursor.Decode(&plan); err != nil {
			continue
		}

		var cust domain.Customer
		if err := db.Collection("customers").FindOne(r.Context(), bson.M{"_id": plan.CustomerID}).Decode(&cust); err != nil {
			continue
		}

		var prodName, prodNameUrdu string
		if plan.ProductID != "" {
			var prod domain.Product
			if err := db.Collection("products").FindOne(r.Context(), bson.M{"_id": plan.ProductID}).Decode(&prod); err == nil {
				prodName = prod.Name
				prodNameUrdu = prod.NameUrdu
			}
		}

		for _, d := range plan.Installments {
			if d.Paid {
				continue
			}
			if d.DueDate.Before(start) || d.DueDate.After(end) || d.DueDate.Equal(end) {
				continue
			}

			result = append(result, map[string]interface{}{
				"id": plan.ID, "customer_name": cust.Name, "customer_urdu": cust.NameUrdu,
				"father_name": cust.FatherName, "phone": cust.Phone,
				"product_name": prodName, "product_name_urdu": prodNameUrdu,
				"installment_no": d.InstallmentNo, "due_date": d.DueDate.Format("2006-01-02"),
				"amount": d.Amount, "paid": d.Paid, "partial_paid": d.PartialPaid,
				"remaining": d.Remaining, "total_amount": plan.TotalAmount,
			})
		}
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
}

func (h *DashboardHandler) ActiveInstallments(w http.ResponseWriter, r *http.Request) {
	db := config.MongoDatabase
	if db == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	cursor, err := db.Collection("installment_plans").Find(r.Context(), bson.M{"status": "active"})
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch", "ناکام")
		return
	}
	defer cursor.Close(r.Context())

	var result []map[string]interface{}
	for cursor.Next(r.Context()) {
		var plan domain.InstallmentPlan
		if err := cursor.Decode(&plan); err != nil {
			continue
		}

		var cust domain.Customer
		if err := db.Collection("customers").FindOne(r.Context(), bson.M{"_id": plan.CustomerID}).Decode(&cust); err != nil {
			continue
		}

		var prodName, prodNameUrdu string
		if plan.ProductID != "" {
			var prod domain.Product
			if err := db.Collection("products").FindOne(r.Context(), bson.M{"_id": plan.ProductID}).Decode(&prod); err == nil {
				prodName = prod.Name
				prodNameUrdu = prod.NameUrdu
			}
		}

		var paidAmount float64
		var paidCount int
		payPipeline := mongo.Pipeline{
			bson.D{{Key: "$match", Value: bson.D{
				{Key: "installmentplanid", Value: plan.ID},
			}}},
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
				{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
			}}},
		}
		payCursor, _ := db.Collection("payments").Aggregate(r.Context(), payPipeline)
		if payCursor != nil {
			if payCursor.Next(r.Context()) {
				var r struct {
					Total float64 `bson:"total"`
					Count int     `bson:"count"`
				}
				if payCursor.Decode(&r) == nil {
					paidAmount = r.Total
					paidCount = r.Count
				}
			}
			payCursor.Close(r.Context())
		}
		paidAmount += plan.DownPayment

		result = append(result, map[string]interface{}{
			"id": plan.ID, "customer_name": cust.Name, "customer_urdu": cust.NameUrdu,
			"father_name": cust.FatherName, "phone": cust.Phone,
			"product_name": prodName, "product_name_urdu": prodNameUrdu,
			"total_amount": plan.TotalAmount, "down_payment": plan.DownPayment,
			"remaining_amount": plan.RemainingAmount, "num_installments": plan.NumberOfInstallments,
			"paid_amount": paidAmount, "paid_count": paidCount,
			"start_date": plan.StartDate.Format("2006-01-02"),
			"end_date":   plan.EndDate.Format("2006-01-02"),
			"status":     plan.Status, "created_by": plan.CreatedBy,
		})
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
}

func (h *DashboardHandler) CompletedInstallments(w http.ResponseWriter, r *http.Request) {
	db := config.MongoDatabase
	if db == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	cursor, err := db.Collection("installment_plans").Find(r.Context(), bson.M{"status": "completed"})
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch", "ناکام")
		return
	}
	defer cursor.Close(r.Context())

	var result []map[string]interface{}
	for cursor.Next(r.Context()) {
		var plan domain.InstallmentPlan
		if err := cursor.Decode(&plan); err != nil {
			continue
		}

		var cust domain.Customer
		if err := db.Collection("customers").FindOne(r.Context(), bson.M{"_id": plan.CustomerID}).Decode(&cust); err != nil {
			continue
		}

		var prodName, prodNameUrdu string
		if plan.ProductID != "" {
			var prod domain.Product
			if err := db.Collection("products").FindOne(r.Context(), bson.M{"_id": plan.ProductID}).Decode(&prod); err == nil {
				prodName = prod.Name
				prodNameUrdu = prod.NameUrdu
			}
		}

		result = append(result, map[string]interface{}{
			"id": plan.ID, "customer_name": cust.Name, "customer_urdu": cust.NameUrdu,
			"father_name": cust.FatherName, "phone": cust.Phone,
			"product_name": prodName, "product_name_urdu": prodNameUrdu,
			"total_amount": plan.TotalAmount, "down_payment": plan.DownPayment,
			"remaining_amount": plan.RemainingAmount, "num_installments": plan.NumberOfInstallments,
			"start_date": plan.StartDate.Format("2006-01-02"),
			"end_date":   plan.EndDate.Format("2006-01-02"),
			"status":     plan.Status, "created_by": plan.CreatedBy,
		})
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
}

func (h *DashboardHandler) CustomersWithFinance(w http.ResponseWriter, r *http.Request) {
	db := config.MongoDatabase
	if db == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	cursor, err := db.Collection("installment_plans").Find(r.Context(), bson.M{"status": "active"})
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch", "ناکام")
		return
	}
	defer cursor.Close(r.Context())

	custMap := make(map[string]map[string]interface{})
	for cursor.Next(r.Context()) {
		var plan domain.InstallmentPlan
		if err := cursor.Decode(&plan); err != nil {
			continue
		}

		if _, exists := custMap[plan.CustomerID]; !exists {
			var cust domain.Customer
			if err := db.Collection("customers").FindOne(r.Context(), bson.M{"_id": plan.CustomerID}).Decode(&cust); err != nil {
				continue
			}

			var prodName, prodNameUrdu string
			if plan.ProductID != "" {
				var prod domain.Product
				if err := db.Collection("products").FindOne(r.Context(), bson.M{"_id": plan.ProductID}).Decode(&prod); err == nil {
					prodName = prod.Name
					prodNameUrdu = prod.NameUrdu
				}
			}

			custMap[plan.CustomerID] = map[string]interface{}{
				"customer_id": cust.ID, "customer_name": cust.Name, "customer_urdu": cust.NameUrdu,
				"father_name": cust.FatherName, "phone": cust.Phone, "cnic": cust.CNIC,
				"address": cust.Address, "product_name": prodName, "product_name_urdu": prodNameUrdu,
				"plan_id": plan.ID, "total_amount": plan.TotalAmount, "down_payment": plan.DownPayment,
				"remaining_amount": plan.RemainingAmount, "num_installments": plan.NumberOfInstallments,
				"installment_amount": plan.InstallmentAmount, "start_date": plan.StartDate.Format("2006-01-02"),
				"end_date": plan.EndDate.Format("2006-01-02"), "status": plan.Status,
			}
		}
	}

	var result []map[string]interface{}
	for _, v := range custMap {
		result = append(result, v)
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
}
