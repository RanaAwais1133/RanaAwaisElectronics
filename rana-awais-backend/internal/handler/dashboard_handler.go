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

	// 1. Today's Collection (from payments only - accounting_entries would double count)
	wg.Add(1)
	go func() {
		defer wg.Done()
		var total float64
		var count int64

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
				{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
			}}},
		}
		payCursor, err := db.Collection("payments").Aggregate(ctx, payPipeline)
		if err == nil {
			if payCursor.Next(ctx) {
				var r struct {
					Total float64 `bson:"total"`
					Count int64   `bson:"count"`
				}
				if payCursor.Decode(&r) == nil {
					total = r.Total
					count = r.Count
				}
			}
			payCursor.Close(ctx)
		}

		results <- result{"todayCollection", map[string]interface{}{"total": total, "count": count}}
	}()

	// 2 & 3. Today Revenue & Profit (using correct profit formula)
	wg.Add(1)
	go func() {
		defer wg.Done()
		var revenue, profit float64

		// Revenue = sum of all payments today
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

		// Profit = sum of (payment × (1 - purchasePrice/totalAmount)) - expenses
		// This correctly handles down payments and installment payments
		profitPipeline := mongo.Pipeline{
			bson.D{{Key: "$match", Value: bson.D{
				{Key: "transactiondate", Value: bson.D{
					{Key: "$gte", Value: todayStart},
					{Key: "$lt", Value: todayEnd},
				}},
			}}},
			bson.D{{Key: "$lookup", Value: bson.D{
				{Key: "from", Value: "installment_plans"},
				{Key: "localField", Value: "installmentplanid"},
				{Key: "foreignField", Value: "_id"},
				{Key: "as", Value: "plan"},
			}}},
			bson.D{{Key: "$unwind", Value: "$plan"}},
			bson.D{{Key: "$lookup", Value: bson.D{
				{Key: "from", Value: "products"},
				{Key: "localField", Value: "plan.productid"},
				{Key: "foreignField", Value: "_id"},
				{Key: "as", Value: "product"},
			}}},
			bson.D{{Key: "$unwind", Value: bson.D{
				{Key: "path", Value: "$product"},
				{Key: "preserveNullAndEmptyArrays", Value: true},
			}}},
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "totalProfit", Value: bson.D{{Key: "$sum", Value: bson.D{
					{Key: "$multiply", Value: bson.A{
						"$amount",
						bson.D{{Key: "$subtract", Value: bson.A{
							1,
							bson.D{{Key: "$cond", Value: bson.A{
								bson.D{{Key: "$gt", Value: bson.A{"$plan.totalamount", 0}}},
								bson.D{{Key: "$divide", Value: bson.A{
									bson.D{{Key: "$ifNull", Value: bson.A{"$product.purchaseprice", 0}}},
									"$plan.totalamount",
								}}},
								0,
							}}},
						}}},
					}},
				}}}},
			}}},
		}
		profitCursor, _ := db.Collection("payments").Aggregate(ctx, profitPipeline)
		if profitCursor != nil {
			if profitCursor.Next(ctx) {
				var r struct{ TotalProfit float64 `bson:"totalProfit"` }
				if profitCursor.Decode(&r) == nil {
					profit = r.TotalProfit
				}
			}
			profitCursor.Close(ctx)
		}

		// Subtract expenses
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
					profit -= r.Total
				}
			}
			expCursor.Close(ctx)
		}

		results <- result{"todayRevenue", revenue}
		results <- result{"todayProfit", profit}
	}()

	// 4 & 5. Month Revenue & Profit (using correct profit formula)
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

		// Profit = sum of (payment × (1 - purchasePrice/totalAmount)) - expenses
		profitPipeline := mongo.Pipeline{
			bson.D{{Key: "$match", Value: bson.D{
				{Key: "transactiondate", Value: bson.D{
					{Key: "$gte", Value: monthStart},
					{Key: "$lt", Value: monthEnd},
				}},
			}}},
			bson.D{{Key: "$lookup", Value: bson.D{
				{Key: "from", Value: "installment_plans"},
				{Key: "localField", Value: "installmentplanid"},
				{Key: "foreignField", Value: "_id"},
				{Key: "as", Value: "plan"},
			}}},
			bson.D{{Key: "$unwind", Value: "$plan"}},
			bson.D{{Key: "$lookup", Value: bson.D{
				{Key: "from", Value: "products"},
				{Key: "localField", Value: "plan.productid"},
				{Key: "foreignField", Value: "_id"},
				{Key: "as", Value: "product"},
			}}},
			bson.D{{Key: "$unwind", Value: bson.D{
				{Key: "path", Value: "$product"},
				{Key: "preserveNullAndEmptyArrays", Value: true},
			}}},
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "totalProfit", Value: bson.D{{Key: "$sum", Value: bson.D{
					{Key: "$multiply", Value: bson.A{
						"$amount",
						bson.D{{Key: "$subtract", Value: bson.A{
							1,
							bson.D{{Key: "$cond", Value: bson.A{
								bson.D{{Key: "$gt", Value: bson.A{"$plan.totalamount", 0}}},
								bson.D{{Key: "$divide", Value: bson.A{
									bson.D{{Key: "$ifNull", Value: bson.A{"$product.purchaseprice", 0}}},
									"$plan.totalamount",
								}}},
								0,
							}}},
						}}},
					}},
				}}}},
			}}},
		}
		profitCursor, _ := db.Collection("payments").Aggregate(ctx, profitPipeline)
		if profitCursor != nil {
			if profitCursor.Next(ctx) {
				var r struct{ TotalProfit float64 `bson:"totalProfit"` }
				if profitCursor.Decode(&r) == nil {
					profit = r.TotalProfit
				}
			}
			profitCursor.Close(ctx)
		}

		// Subtract expenses
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
					profit -= r.Total
				}
			}
			expCursor.Close(ctx)
		}

		results <- result{"monthRevenue", revenue}
		results <- result{"monthProfit", profit}
	}()

	// 6. Total Pending (from installment_details collection)
	wg.Add(1)
	go func() {
		defer wg.Done()
		var total float64
		// Aggregate unpaid installments from installment_details
		// Formula: amount + fine - partial_paid
		pipeline := mongo.Pipeline{
			bson.D{{Key: "$match", Value: bson.D{
				{Key: "paid", Value: false},
			}}},
			bson.D{{Key: "$addFields", Value: bson.D{
				{Key: "effective_fine", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$fine", 0}}}},
				{Key: "effective_partial", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$partial_paid", 0}}}},
			}}},
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "total", Value: bson.D{{Key: "$sum", Value: bson.D{
					{Key: "$subtract", Value: bson.A{
						bson.D{{Key: "$add", Value: bson.A{"$amount", "$effective_fine"}}},
						"$effective_partial",
					}},
				}}}},
			}}},
		}
		cursor, err := db.Collection("installment_details").Aggregate(ctx, pipeline)
		if err == nil {
			defer cursor.Close(ctx)
			if cursor.Next(ctx) {
				var r struct{ Total float64 `bson:"total"` }
				if cursor.Decode(&r) == nil {
					total = r.Total
				}
			}
		}
		results <- result{"totalPending", total}
	}()

	// 6b. Pending Customers Count (from installment_details)
	wg.Add(1)
	go func() {
		defer wg.Done()
		// Get distinct plan_ids with unpaid installments
		cursor, err := db.Collection("installment_details").Find(ctx, bson.M{"paid": false})
		if err == nil {
			defer cursor.Close(ctx)
			planIDs := make(map[string]bool)
			for cursor.Next(ctx) {
				var doc struct {
					PlanID string `bson:"plan_id"`
				}
				if cursor.Decode(&doc) == nil {
					planIDs[doc.PlanID] = true
				}
			}
			// Get unique customer IDs from plans
			custMap := make(map[string]bool)
			for pid := range planIDs {
				var plan domain.InstallmentPlan
				if err := db.Collection("installment_plans").FindOne(ctx, bson.M{"_id": pid}).Decode(&plan); err == nil {
					custMap[plan.CustomerID] = true
				}
			}
			results <- result{"pendingCustomers", int64(len(custMap))}
		} else {
			results <- result{"pendingCustomers", int64(0)}
		}
	}()

	// 6c. Pending Total Amount (same as 6, using installment_details)
	wg.Add(1)
	go func() {
		defer wg.Done()
		var total float64
		// Formula: amount + fine - partial_paid
		pipeline := mongo.Pipeline{
			bson.D{{Key: "$match", Value: bson.D{
				{Key: "paid", Value: false},
			}}},
			bson.D{{Key: "$addFields", Value: bson.D{
				{Key: "effective_fine", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$fine", 0}}}},
				{Key: "effective_partial", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$partial_paid", 0}}}},
			}}},
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "total", Value: bson.D{{Key: "$sum", Value: bson.D{
					{Key: "$subtract", Value: bson.A{
						bson.D{{Key: "$add", Value: bson.A{"$amount", "$effective_fine"}}},
						"$effective_partial",
					}},
				}}}},
			}}},
		}
		cursor, err := db.Collection("installment_details").Aggregate(ctx, pipeline)
		if err == nil {
			defer cursor.Close(ctx)
			if cursor.Next(ctx) {
				var r struct{ Total float64 `bson:"total"` }
				if cursor.Decode(&r) == nil {
					total = r.Total
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
			"in_stock":   true,
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

	// 15. Overdue Installments count (from installment_details)
	wg.Add(1)
	go func() {
		defer wg.Done()
		count, err := db.Collection("installment_details").CountDocuments(ctx, bson.M{
			"paid":     false,
			"due_date": bson.M{"$lt": todayStart},
		})
		if err != nil {
			count = 0
		}
		results <- result{"overdueCount", count}
	}()

	// 16. Today Due count (from installment_details)
	wg.Add(1)
	go func() {
		defer wg.Done()
		count, err := db.Collection("installment_details").CountDocuments(ctx, bson.M{
			"paid":     false,
			"due_date": bson.M{"$gte": todayStart, "$lt": todayEnd},
		})
		if err != nil {
			count = 0
		}
		results <- result{"todayDueCount", count}
	}()

	// 17. Monthly Due count (from installment_details)
	wg.Add(1)
	go func() {
		defer wg.Done()
		count, err := db.Collection("installment_details").CountDocuments(ctx, bson.M{
			"paid":     false,
			"due_date": bson.M{"$gte": monthStart, "$lt": monthEnd},
		})
		if err != nil {
			count = 0
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

	// Query installment_details directly for today's due installments
	detailCursor, err := db.Collection("installment_details").Find(r.Context(), bson.M{
		"due_date": bson.M{"$gte": start, "$lt": end},
		"paid":     false,
	})
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch", "ناکام")
		return
	}
	defer detailCursor.Close(r.Context())

	var detailDocs []struct {
		PlanID        string     `bson:"plan_id"`
		InstallmentNo int        `bson:"installment_no"`
		DueDate       time.Time  `bson:"due_date"`
		Amount        float64    `bson:"amount"`
		Paid          bool       `bson:"paid"`
		PaidDate      *time.Time `bson:"paid_date,omitempty"`
		PartialPaid   float64    `bson:"partial_paid"`
		Remaining     float64    `bson:"remaining"`
		CollectedBy   string     `bson:"collected_by,omitempty"`
	}
	err = detailCursor.All(r.Context(), &detailDocs)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch", "ناکام")
		return
	}

	// Collect unique plan IDs
	planIDs := make(map[string]bool)
	for _, d := range detailDocs {
		planIDs[d.PlanID] = true
	}

	var result []map[string]interface{}
	for pid := range planIDs {
		var plan domain.InstallmentPlan
		if err := db.Collection("installment_plans").FindOne(r.Context(), bson.M{"_id": pid}).Decode(&plan); err != nil {
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

		for _, d := range detailDocs {
			if d.PlanID != pid {
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

	// Query installment_details for overdue unpaid installments
	detailCursor, err := db.Collection("installment_details").Find(r.Context(), bson.M{
		"paid":     false,
		"due_date": bson.M{"$lt": today},
	})
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch overdue", "ناکام")
		return
	}
	defer detailCursor.Close(r.Context())

	var detailDocs []struct {
		PlanID        string     `bson:"plan_id"`
		InstallmentNo int        `bson:"installment_no"`
		DueDate       time.Time  `bson:"due_date"`
		Amount        float64    `bson:"amount"`
		Paid          bool       `bson:"paid"`
		PaidDate      *time.Time `bson:"paid_date,omitempty"`
		PartialPaid   float64    `bson:"partial_paid"`
		Remaining     float64    `bson:"remaining"`
		CollectedBy   string     `bson:"collected_by,omitempty"`
		Fine          float64    `bson:"fine"`
	}
	err = detailCursor.All(r.Context(), &detailDocs)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch overdue", "ناکام")
		return
	}

	// Collect unique plan IDs
	planIDs := make(map[string]bool)
	for _, d := range detailDocs {
		planIDs[d.PlanID] = true
	}

	var result []map[string]interface{}
	for pid := range planIDs {
		var plan domain.InstallmentPlan
		if err := db.Collection("installment_plans").FindOne(r.Context(), bson.M{"_id": pid}).Decode(&plan); err != nil {
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

		for _, d := range detailDocs {
			if d.PlanID != pid {
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
		"in_stock":   true,
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

	// Query installment_details directly for monthly due installments
	detailCursor, err := db.Collection("installment_details").Find(r.Context(), bson.M{
		"due_date": bson.M{"$gte": start, "$lt": end},
		"paid":     false,
	})
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch", "ناکام")
		return
	}
	defer detailCursor.Close(r.Context())

	var detailDocs []struct {
		PlanID        string    `bson:"plan_id"`
		InstallmentNo int       `bson:"installment_no"`
		DueDate       time.Time `bson:"due_date"`
		Amount        float64   `bson:"amount"`
		Paid          bool      `bson:"paid"`
		PartialPaid   float64   `bson:"partial_paid"`
		Remaining     float64   `bson:"remaining"`
	}
	err = detailCursor.All(r.Context(), &detailDocs)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch", "ناکام")
		return
	}

	// Collect unique plan IDs
	planIDs := make(map[string]bool)
	for _, d := range detailDocs {
		planIDs[d.PlanID] = true
	}

	var result []map[string]interface{}
	for pid := range planIDs {
		var plan domain.InstallmentPlan
		if err := db.Collection("installment_plans").FindOne(r.Context(), bson.M{"_id": pid}).Decode(&plan); err != nil {
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

		for _, d := range detailDocs {
			if d.PlanID != pid {
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
		// Down payment is already recorded in payments collection by CreatePlan
		// No need to add it again - avoids double counting

		// Calculate actual remaining amount from payments
		actualRemaining := plan.TotalAmount - paidAmount
		if actualRemaining < 0 {
			actualRemaining = 0
		}

		result = append(result, map[string]interface{}{
			"id": plan.ID, "customer_name": cust.Name, "customer_urdu": cust.NameUrdu,
			"father_name": cust.FatherName, "phone": cust.Phone,
			"product_name": prodName, "product_name_urdu": prodNameUrdu,
			"total_amount": plan.TotalAmount, "down_payment": plan.DownPayment,
			"remaining_amount": actualRemaining, "num_installments": plan.NumberOfInstallments,
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

		// Calculate actual paid amount from payments
		var paidAmount float64
		payPipeline := mongo.Pipeline{
			bson.D{{Key: "$match", Value: bson.D{
				{Key: "installmentplanid", Value: plan.ID},
			}}},
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
			}}},
		}
		payCursor, _ := db.Collection("payments").Aggregate(r.Context(), payPipeline)
		if payCursor != nil {
			if payCursor.Next(r.Context()) {
				var r struct{ Total float64 `bson:"total"` }
				if payCursor.Decode(&r) == nil {
					paidAmount = r.Total
				}
			}
			payCursor.Close(r.Context())
		}

		actualRemaining := plan.TotalAmount - paidAmount
		if actualRemaining < 0 {
			actualRemaining = 0
		}

		result = append(result, map[string]interface{}{
			"id": plan.ID, "customer_name": cust.Name, "customer_urdu": cust.NameUrdu,
			"father_name": cust.FatherName, "phone": cust.Phone,
			"product_name": prodName, "product_name_urdu": prodNameUrdu,
			"total_amount": plan.TotalAmount, "down_payment": plan.DownPayment,
			"remaining_amount": actualRemaining, "num_installments": plan.NumberOfInstallments,
			"paid_amount": paidAmount,
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

			// Calculate actual paid amount from payments
			var paidAmount float64
			payPipeline := mongo.Pipeline{
				bson.D{{Key: "$match", Value: bson.D{
					{Key: "installmentplanid", Value: plan.ID},
				}}},
				bson.D{{Key: "$group", Value: bson.D{
					{Key: "_id", Value: nil},
					{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
				}}},
			}
			payCursor, _ := db.Collection("payments").Aggregate(r.Context(), payPipeline)
			if payCursor != nil {
				if payCursor.Next(r.Context()) {
					var r struct{ Total float64 `bson:"total"` }
					if payCursor.Decode(&r) == nil {
						paidAmount = r.Total
					}
				}
				payCursor.Close(r.Context())
			}

			actualRemaining := plan.TotalAmount - paidAmount
			if actualRemaining < 0 {
				actualRemaining = 0
			}

			custMap[plan.CustomerID] = map[string]interface{}{
				"customer_id": cust.ID, "customer_name": cust.Name, "customer_urdu": cust.NameUrdu,
				"father_name": cust.FatherName, "phone": cust.Phone, "cnic": cust.CNIC,
				"address": cust.Address, "product_name": prodName, "product_name_urdu": prodNameUrdu,
				"plan_id": plan.ID, "total_amount": plan.TotalAmount, "down_payment": plan.DownPayment,
				"remaining_amount": actualRemaining, "num_installments": plan.NumberOfInstallments,
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
