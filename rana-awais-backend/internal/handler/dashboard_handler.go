package handler

import (
	"net/http"
	"sync"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type DashboardHandler struct{}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{}
}

// Summary returns all dashboard summary data in a single API call
func (h *DashboardHandler) Summary(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	ctx := r.Context()
	now := time.Now()

	// Date boundaries
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	todayEnd := todayStart.Add(24 * time.Hour)
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	monthEnd := monthStart.AddDate(0, 1, 0)

	// Run all aggregations concurrently using goroutines
	type result struct {
		key   string
		value interface{}
	}

	// FIXED: Use WaitGroup to properly track completion of all goroutines
	// The old code waited for 25 results but only 15 goroutines existed, causing a hang
	var wg sync.WaitGroup
	results := make(chan result, 17)
	errChan := make(chan error, 17)

	// 1. Today's Collection (payments made today)
	wg.Add(1)
	go func() {
		defer wg.Done()
		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{
				"transaction_date": bson.M{"$gte": todayStart, "$lt": todayEnd},
			}}},
			{{Key: "$group", Value: bson.M{
				"_id":   nil,
				"total": bson.M{"$sum": "$amount"},
				"count": bson.M{"$sum": 1},
			}}},
		}
		cursor, err := db.Collection(config.ColPayments).Aggregate(ctx, pipeline)
		if err != nil {
			errChan <- err
			return
		}
		defer cursor.Close(ctx)
		var data []struct {
			Total float64 `bson:"total"`
			Count int     `bson:"count"`
		}
		if cursor.All(ctx, &data) == nil && len(data) > 0 {
			results <- result{"todayCollection", map[string]interface{}{"total": data[0].Total, "count": data[0].Count}}
		} else {
			results <- result{"todayCollection", map[string]interface{}{"total": 0.0, "count": 0}}
		}
	}()

	// 2. Today's Revenue & Profit (proportional profit from installment payments)
	wg.Add(1)
	go func() {
		defer wg.Done()
		// Revenue from payments today
		payPipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{
				"transaction_date": bson.M{"$gte": todayStart, "$lt": todayEnd},
			}}},
			{{Key: "$group", Value: bson.M{
				"_id":   nil,
				"total": bson.M{"$sum": "$amount"},
			}}},
		}
		payCursor, err := db.Collection(config.ColPayments).Aggregate(ctx, payPipeline)
		if err != nil {
			errChan <- err
			return
		}
		defer payCursor.Close(ctx)
		var payData []struct {
			Total float64 `bson:"total"`
		}
		revenue := 0.0
		if payCursor.All(ctx, &payData) == nil && len(payData) > 0 {
			revenue = payData[0].Total
		}

		// Calculate proportional profit from today's payments
		// For each payment, find the linked installment plan and inventory item
		// Profit per installment = (selling_price - purchase_price) / num_installments
		profit := 0.0
		if revenue > 0 {
			// Pipeline: payments -> installment plans -> inventory items
			profitPipeline := mongo.Pipeline{
				{{Key: "$match", Value: bson.M{
					"transaction_date": bson.M{"$gte": todayStart, "$lt": todayEnd},
				}}},
				{{Key: "$lookup", Value: bson.M{
					"from":         config.ColInstallments,
					"localField":   "installment_plan_id",
					"foreignField": "_id",
					"as":           "plan",
				}}},
				{{Key: "$unwind", Value: bson.M{"path": "$plan", "preserveNullAndEmptyArrays": true}}},
				{{Key: "$lookup", Value: bson.M{
					"from":         config.ColInventory,
					"localField":   "plan.inventory_item_id",
					"foreignField": "_id",
					"as":           "inventory",
				}}},
				{{Key: "$unwind", Value: bson.M{"path": "$inventory", "preserveNullAndEmptyArrays": true}}},
				{{Key: "$group", Value: bson.M{
					"_id": nil,
					"totalRevenue": bson.M{"$sum": "$amount"},
					"totalProfit": bson.M{"$sum": bson.M{
						"$cond": bson.A{
							bson.M{"$and": bson.A{
								bson.M{"$gt": bson.A{bson.M{"$ifNull": bson.A{"$inventory.selling_price", 0}}, 0}},
								bson.M{"$gt": bson.A{bson.M{"$ifNull": bson.A{"$inventory.purchase_price", 0}}, 0}},
								bson.M{"$gt": bson.A{bson.M{"$ifNull": bson.A{"$plan.num_installments", 1}}, 0}},
							}},
							// Proportional profit = (selling_price - purchase_price) / num_installments
							bson.M{"$divide": bson.A{
								bson.M{"$subtract": bson.A{
									bson.M{"$ifNull": bson.A{"$inventory.selling_price", 0}},
									bson.M{"$ifNull": bson.A{"$inventory.purchase_price", 0}},
								}},
								bson.M{"$ifNull": bson.A{"$plan.num_installments", 1}},
							}},
							// Fallback: if no inventory data, use 10% of payment as estimated profit
							bson.M{"$multiply": bson.A{"$amount", 0.10}},
						},
					}},
				}}},
			}
			profitCursor, err := db.Collection(config.ColPayments).Aggregate(ctx, profitPipeline)
			if err == nil {
				defer profitCursor.Close(ctx)
				var profitResults []struct {
					TotalRevenue float64 `bson:"totalRevenue"`
					TotalProfit  float64 `bson:"totalProfit"`
				}
				if profitCursor.All(ctx, &profitResults) == nil && len(profitResults) > 0 {
					profit = profitResults[0].TotalProfit
				}
			}
			// Profit cannot exceed revenue
			if profit > revenue {
				profit = revenue
			}
		}

		results <- result{"todayRevenue", revenue}
		results <- result{"todayProfit", profit}
	}()

	// 3. Month's Revenue & Profit (proportional profit from installment payments)
	wg.Add(1)
	go func() {
		defer wg.Done()
		payPipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{
				"transaction_date": bson.M{"$gte": monthStart, "$lt": monthEnd},
			}}},
			{{Key: "$group", Value: bson.M{
				"_id":   nil,
				"total": bson.M{"$sum": "$amount"},
			}}},
		}
		payCursor, err := db.Collection(config.ColPayments).Aggregate(ctx, payPipeline)
		if err != nil {
			errChan <- err
			return
		}
		defer payCursor.Close(ctx)
		var payData []struct {
			Total float64 `bson:"total"`
		}
		revenue := 0.0
		if payCursor.All(ctx, &payData) == nil && len(payData) > 0 {
			revenue = payData[0].Total
		}

		// Calculate proportional profit from this month's payments
		profit := 0.0
		if revenue > 0 {
			profitPipeline := mongo.Pipeline{
				{{Key: "$match", Value: bson.M{
					"transaction_date": bson.M{"$gte": monthStart, "$lt": monthEnd},
				}}},
				{{Key: "$lookup", Value: bson.M{
					"from":         config.ColInstallments,
					"localField":   "installment_plan_id",
					"foreignField": "_id",
					"as":           "plan",
				}}},
				{{Key: "$unwind", Value: bson.M{"path": "$plan", "preserveNullAndEmptyArrays": true}}},
				{{Key: "$lookup", Value: bson.M{
					"from":         config.ColInventory,
					"localField":   "plan.inventory_item_id",
					"foreignField": "_id",
					"as":           "inventory",
				}}},
				{{Key: "$unwind", Value: bson.M{"path": "$inventory", "preserveNullAndEmptyArrays": true}}},
				{{Key: "$group", Value: bson.M{
					"_id": nil,
					"totalRevenue": bson.M{"$sum": "$amount"},
					"totalProfit": bson.M{"$sum": bson.M{
						"$cond": bson.A{
							bson.M{"$and": bson.A{
								bson.M{"$gt": bson.A{bson.M{"$ifNull": bson.A{"$inventory.selling_price", 0}}, 0}},
								bson.M{"$gt": bson.A{bson.M{"$ifNull": bson.A{"$inventory.purchase_price", 0}}, 0}},
								bson.M{"$gt": bson.A{bson.M{"$ifNull": bson.A{"$plan.num_installments", 1}}, 0}},
							}},
							// Proportional profit = (selling_price - purchase_price) / num_installments
							bson.M{"$divide": bson.A{
								bson.M{"$subtract": bson.A{
									bson.M{"$ifNull": bson.A{"$inventory.selling_price", 0}},
									bson.M{"$ifNull": bson.A{"$inventory.purchase_price", 0}},
								}},
								bson.M{"$ifNull": bson.A{"$plan.num_installments", 1}},
							}},
							// Fallback: 10% of payment as estimated profit
							bson.M{"$multiply": bson.A{"$amount", 0.10}},
						},
					}},
				}}},
			}
			profitCursor, err := db.Collection(config.ColPayments).Aggregate(ctx, profitPipeline)
			if err == nil {
				defer profitCursor.Close(ctx)
				var profitResults []struct {
					TotalRevenue float64 `bson:"totalRevenue"`
					TotalProfit  float64 `bson:"totalProfit"`
				}
				if profitCursor.All(ctx, &profitResults) == nil && len(profitResults) > 0 {
					profit = profitResults[0].TotalProfit
				}
			}
			if profit > revenue {
				profit = revenue
			}
		}

		results <- result{"monthRevenue", revenue}
		results <- result{"monthProfit", profit}
	}()

	// 4. Total Pending (all unpaid installments across all active plans)
	wg.Add(1)
	go func() {
		defer wg.Done()
		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{"status": "active"}}},
			{{Key: "$unwind", Value: "$installments"}},
			{{Key: "$match", Value: bson.M{"installments.paid": false}}},
			{{Key: "$group", Value: bson.M{
				"_id": nil,
				"total": bson.M{"$sum": bson.M{
					"$subtract": bson.A{
						bson.M{"$add": bson.A{bson.M{"$ifNull": bson.A{"$installments.amount", 0}}, bson.M{"$ifNull": bson.A{"$installments.fine", 0}}}},
						bson.M{"$ifNull": bson.A{"$installments.partial_paid", 0}},
					},
				}},
			}}},
		}
		cursor, err := db.Collection(config.ColInstallments).Aggregate(ctx, pipeline)
		if err != nil {
			errChan <- err
			return
		}
		defer cursor.Close(ctx)
		var data []struct {
			Total float64 `bson:"total"`
		}
		total := 0.0
		if cursor.All(ctx, &data) == nil && len(data) > 0 && data[0].Total > 0 {
			total = data[0].Total
		}
		results <- result{"totalPending", total}
	}()

	// 5. Total Paid (all payments ever)
	wg.Add(1)
	go func() {
		defer wg.Done()
		pipeline := mongo.Pipeline{
			{{Key: "$group", Value: bson.M{
				"_id":   nil,
				"total": bson.M{"$sum": "$amount"},
			}}},
		}
		cursor, err := db.Collection(config.ColPayments).Aggregate(ctx, pipeline)
		if err != nil {
			errChan <- err
			return
		}
		defer cursor.Close(ctx)
		var data []struct {
			Total float64 `bson:"total"`
		}
		total := 0.0
		if cursor.All(ctx, &data) == nil && len(data) > 0 {
			total = data[0].Total
		}
		results <- result{"totalPaid", total}
	}()

	// 6. Total Customers
	wg.Add(1)
	go func() {
		defer wg.Done()
		count, err := db.Collection(config.ColCustomers).CountDocuments(ctx, bson.M{})
		if err != nil {
			errChan <- err
			return
		}
		results <- result{"totalCustomers", count}
	}()

	// 7. Active Installments (active plans)
	wg.Add(1)
	go func() {
		defer wg.Done()
		count, err := db.Collection(config.ColInstallments).CountDocuments(ctx, bson.M{"status": "active"})
		if err != nil {
			errChan <- err
			return
		}
		results <- result{"activeInstallments", count}
	}()

	// 8. Completed Plans (completed status)
	wg.Add(1)
	go func() {
		defer wg.Done()
		count, err := db.Collection(config.ColInstallments).CountDocuments(ctx, bson.M{"status": "completed"})
		if err != nil {
			errChan <- err
			return
		}
		results <- result{"completedInstallments", count}
	}()

	// 9. Overdue Customers (customers with overdue installments)
	wg.Add(1)
	go func() {
		defer wg.Done()
		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{"status": "active"}}},
			{{Key: "$unwind", Value: "$installments"}},
			{{Key: "$match", Value: bson.M{
				"installments.paid":     false,
				"installments.due_date": bson.M{"$lt": todayStart},
			}}},
			{{Key: "$group", Value: bson.M{
				"_id": "$customer_id",
			}}},
			{{Key: "$count", Value: "count"}},
		}
		cursor, err := db.Collection(config.ColInstallments).Aggregate(ctx, pipeline)
		if err != nil {
			errChan <- err
			return
		}
		defer cursor.Close(ctx)
		var data []struct {
			Count int `bson:"count"`
		}
		count := 0
		if cursor.All(ctx, &data) == nil && len(data) > 0 {
			count = data[0].Count
		}
		results <- result{"overdueCustomers", count}
	}()

	// 10. Today's Due (installments due today)
	wg.Add(1)
	go func() {
		defer wg.Done()
		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{"status": "active"}}},
			{{Key: "$unwind", Value: "$installments"}},
			{{Key: "$match", Value: bson.M{
				"installments.paid":     false,
				"installments.due_date": bson.M{"$gte": todayStart, "$lt": todayEnd},
			}}},
			{{Key: "$count", Value: "count"}},
		}
		cursor, err := db.Collection(config.ColInstallments).Aggregate(ctx, pipeline)
		if err != nil {
			errChan <- err
			return
		}
		defer cursor.Close(ctx)
		var data []struct {
			Count int `bson:"count"`
		}
		count := 0
		if cursor.All(ctx, &data) == nil && len(data) > 0 {
			count = data[0].Count
		}
		results <- result{"todayDue", count}
	}()

	// 11. Monthly Due (installments due this month)
	wg.Add(1)
	go func() {
		defer wg.Done()
		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{"status": "active"}}},
			{{Key: "$unwind", Value: "$installments"}},
			{{Key: "$match", Value: bson.M{
				"installments.paid":     false,
				"installments.due_date": bson.M{"$gte": monthStart, "$lt": monthEnd},
			}}},
			{{Key: "$count", Value: "count"}},
		}
		cursor, err := db.Collection(config.ColInstallments).Aggregate(ctx, pipeline)
		if err != nil {
			errChan <- err
			return
		}
		defer cursor.Close(ctx)
		var data []struct {
			Count int `bson:"count"`
		}
		count := 0
		if cursor.All(ctx, &data) == nil && len(data) > 0 {
			count = data[0].Count
		}
		results <- result{"monthlyDueCount", count}
	}()

	// 12. Total Products
	wg.Add(1)
	go func() {
		defer wg.Done()
		count, err := db.Collection(config.ColProducts).CountDocuments(ctx, bson.M{})
		if err != nil {
			errChan <- err
			return
		}
		results <- result{"totalProducts", count}
	}()

	// 13. Low Stock Items (stock <= 5)
	wg.Add(1)
	go func() {
		defer wg.Done()
		count, err := db.Collection(config.ColInventory).CountDocuments(ctx, bson.M{
			"quantity": bson.M{"$lte": 5},
			"status":   "in_stock",
		})
		if err != nil {
			errChan <- err
			return
		}
		results <- result{"lowStockItems", count}
	}()

	// 14. Inventory Value (sum of quantity * purchase_price for in_stock items)
	wg.Add(1)
	go func() {
		defer wg.Done()
		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{"status": "in_stock"}}},
			{{Key: "$group", Value: bson.M{
				"_id": nil,
				"total": bson.M{"$sum": bson.M{
					"$multiply": bson.A{
						bson.M{"$ifNull": bson.A{"$quantity", 0}},
						bson.M{"$ifNull": bson.A{"$purchase_price", 0}},
					},
				}},
			}}},
		}
		cursor, err := db.Collection(config.ColInventory).Aggregate(ctx, pipeline)
		if err != nil {
			errChan <- err
			return
		}
		defer cursor.Close(ctx)
		var data []struct {
			Total float64 `bson:"total"`
		}
		total := 0.0
		if cursor.All(ctx, &data) == nil && len(data) > 0 {
			total = data[0].Total
		}
		results <- result{"inventoryValue", total}
	}()

	// 15. Ageing Stock (items older than 90 days)
	wg.Add(1)
	go func() {
		defer wg.Done()
		cutoff := now.AddDate(0, 0, -90)
		count, err := db.Collection(config.ColInventory).CountDocuments(ctx, bson.M{
			"created_at": bson.M{"$lte": cutoff},
			"status":     "in_stock",
		})
		if err != nil {
			errChan <- err
			return
		}
		results <- result{"ageingStock", count}
	}()

	// Close results channel when all goroutines complete
	go func() {
		wg.Wait()
		close(results)
		close(errChan)
	}()

	// Collect all results
	summary := bson.M{}
	for res := range results {
		summary[res.key] = res.value
	}

	// Ensure all fields exist with defaults
	fields := []string{"todayCollection", "todayRevenue", "todayProfit", "monthRevenue", "monthProfit",
		"totalPending", "totalPaid", "totalCustomers", "activeInstallments", "completedInstallments",
		"overdueCustomers", "todayDue", "monthlyDueCount", "totalProducts", "lowStockItems",
		"inventoryValue", "ageingStock"}

	for _, f := range fields {
		if _, ok := summary[f]; !ok {
			switch f {
			case "todayCollection":
				summary[f] = map[string]interface{}{"total": 0.0, "count": 0}
			default:
				summary[f] = 0
			}
		}
	}

	respondJSON(w, http.StatusOK, summary)
}

// OverdueDetails returns overdue installment details
func (h *DashboardHandler) OverdueDetails(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	ctx := r.Context()
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"status": "active"}}},
		{{Key: "$unwind", Value: "$installments"}},
		{{Key: "$match", Value: bson.M{
			"installments.paid":     false,
			"installments.due_date": bson.M{"$lt": todayStart},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColCustomers,
			"localField":   "customer_id",
			"foreignField": "_id",
			"as":           "customer",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$customer", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColProducts,
			"localField":   "product_id",
			"foreignField": "_id",
			"as":           "product",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$product", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$project", Value: bson.M{
			"plan_id":           bson.M{"$toString": "$_id"},
			"customer_id":       bson.M{"$toString": "$customer_id"},
			"customer_name":     "$customer.name",
			"customer_urdu":     "$customer.name_urdu",
			"father_name":       "$customer.father_name",
			"phone":             "$customer.phone",
			"cnic":              "$customer.cnic",
			"address":           "$customer.address",
			"address_urdu":      "$customer.address_urdu",
			"product_name":      "$product.name",
			"product_name_urdu": "$product.name_urdu",
			"installment_no":    "$installments.installment_no",
			"due_date":          bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$installments.due_date"}},
			"amount":            "$installments.amount",
			"fine":              "$installments.fine",
			"partial_paid":      "$installments.partial_paid",
			"paid":              "$installments.paid",
			"paid_date": bson.M{"$cond": bson.A{
				bson.M{"$ifNull": bson.A{"$installments.paid_date", false}},
				bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$installments.paid_date"}},
				"",
			}},
			"paid_count":         "$paid_count",
			"total_installments": "$num_installments",
			"remaining":          "$remaining",
			"total_amount":       "$total_amount",
			"down_payment":       "$down_payment",
			"remaining_amount":   "$remaining_amount",
			"is_overdue":         true,
		}}},
		{{Key: "$sort", Value: bson.M{"due_date": 1}}},
	}

	cursor, err := db.Collection(config.ColInstallments).Aggregate(ctx, pipeline)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch overdue details", "ناکام")
		return
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "ناکام")
		return
	}
	if results == nil {
		results = []bson.M{}
	}

	respondJSON(w, http.StatusOK, results)
}

// ActiveInstallments returns all active installment plans with full customer and product details
func (h *DashboardHandler) ActiveInstallments(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	ctx := r.Context()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"status": "active"}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColCustomers,
			"localField":   "customer_id",
			"foreignField": "_id",
			"as":           "customer",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$customer", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColProducts,
			"localField":   "product_id",
			"foreignField": "_id",
			"as":           "product",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$product", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$addFields", Value: bson.M{
			"paid_count": bson.M{
				"$size": bson.M{
					"$filter": bson.M{
						"input": "$installments",
						"as":    "inst",
						"cond":  bson.M{"$eq": bson.A{"$$inst.paid", true}},
					},
				},
			},
			"paid_amount": bson.M{
				"$sum": bson.M{
					"$map": bson.M{
						"input": bson.M{
							"$filter": bson.M{
								"input": "$installments",
								"as":    "inst",
								"cond":  bson.M{"$eq": bson.A{"$$inst.paid", true}},
							},
						},
						"as": "inst",
						"in": bson.M{"$ifNull": bson.A{"$$inst.amount", 0}},
					},
				},
			},
			"pending_amount": bson.M{
				"$sum": bson.M{
					"$map": bson.M{
						"input": bson.M{
							"$filter": bson.M{
								"input": "$installments",
								"as":    "inst",
								"cond":  bson.M{"$eq": bson.A{"$$inst.paid", false}},
							},
						},
						"as": "inst",
						"in": bson.M{"$ifNull": bson.A{"$$inst.amount", 0}},
					},
				},
			},
			"remaining": bson.M{
				"$subtract": bson.A{
					"$num_installments",
					bson.M{
						"$size": bson.M{
							"$filter": bson.M{
								"input": "$installments",
								"as":    "inst",
								"cond":  bson.M{"$eq": bson.A{"$$inst.paid", true}},
							},
						},
					},
				},
			},
		}}},
		{{Key: "$project", Value: bson.M{
			"plan_id":           bson.M{"$toString": "$_id"},
			"customer_id":       bson.M{"$toString": "$customer_id"},
			"customer_name":     "$customer.name",
			"customer_urdu":     "$customer.name_urdu",
			"father_name":       "$customer.father_name",
			"phone":             "$customer.phone",
			"cnic":              "$customer.cnic",
			"address":           "$customer.address",
			"address_urdu":      "$customer.address_urdu",
			"product_name":      "$product.name",
			"product_name_urdu": "$product.name_urdu",
			"total_amount":      "$total_amount",
			"down_payment":      "$down_payment",
			"remaining_amount":  "$remaining_amount",
			"num_installments":  "$num_installments",
			"paid_count":        1,
			"paid_amount":       1,
			"pending_amount":    1,
			"remaining":         1,
			"status":            "$status",
			"created_at":        bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$created_at"}},
		}}},
		{{Key: "$sort", Value: bson.M{"created_at": -1}}},
	}

	cursor, err := db.Collection(config.ColInstallments).Aggregate(ctx, pipeline)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch active installments", "ناکام")
		return
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "ناکام")
		return
	}
	if results == nil {
		results = []bson.M{}
	}

	respondJSON(w, http.StatusOK, results)
}

// CompletedInstallments returns all completed installment plans with full customer and product details
func (h *DashboardHandler) CompletedInstallments(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	ctx := r.Context()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"status": "completed"}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColCustomers,
			"localField":   "customer_id",
			"foreignField": "_id",
			"as":           "customer",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$customer", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColProducts,
			"localField":   "product_id",
			"foreignField": "_id",
			"as":           "product",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$product", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$addFields", Value: bson.M{
			"paid_count": bson.M{
				"$size": bson.M{
					"$filter": bson.M{
						"input": "$installments",
						"as":    "inst",
						"cond":  bson.M{"$eq": bson.A{"$$inst.paid", true}},
					},
				},
			},
			"paid_amount": bson.M{
				"$sum": bson.M{
					"$map": bson.M{
						"input": "$installments",
						"as":    "inst",
						"in":    bson.M{"$ifNull": bson.A{"$$inst.amount", 0}},
					},
				},
			},
			"pending_amount": 0,
			"remaining":      0,
		}}},
		{{Key: "$project", Value: bson.M{
			"plan_id":           bson.M{"$toString": "$_id"},
			"customer_id":       bson.M{"$toString": "$customer_id"},
			"customer_name":     "$customer.name",
			"customer_urdu":     "$customer.name_urdu",
			"father_name":       "$customer.father_name",
			"phone":             "$customer.phone",
			"cnic":              "$customer.cnic",
			"address":           "$customer.address",
			"address_urdu":      "$customer.address_urdu",
			"product_name":      "$product.name",
			"product_name_urdu": "$product.name_urdu",
			"total_amount":      "$total_amount",
			"down_payment":      "$down_payment",
			"remaining_amount":  0,
			"num_installments":  "$num_installments",
			"paid_count":        1,
			"paid_amount":       1,
			"pending_amount":    1,
			"remaining":         1,
			"status":            "$status",
			"created_at":        bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$created_at"}},
		}}},
		{{Key: "$sort", Value: bson.M{"created_at": -1}}},
	}

	cursor, err := db.Collection(config.ColInstallments).Aggregate(ctx, pipeline)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch completed installments", "ناکام")
		return
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "ناکام")
		return
	}
	if results == nil {
		results = []bson.M{}
	}

	respondJSON(w, http.StatusOK, results)
}

// CustomersWithFinance returns all customers with their total purchase, paid, and remaining amounts
func (h *DashboardHandler) CustomersWithFinance(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	ctx := r.Context()

	pipeline := mongo.Pipeline{
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColInstallments,
			"localField":   "_id",
			"foreignField": "customer_id",
			"as":           "plans",
		}}},
		{{Key: "$addFields", Value: bson.M{
			"total_purchase": bson.M{
				"$sum": bson.M{
					"$map": bson.M{
						"input": "$plans",
						"as":    "plan",
						"in":    bson.M{"$ifNull": bson.A{"$$plan.total_amount", 0}},
					},
				},
			},
			"total_paid": bson.M{
				"$sum": bson.M{
					"$map": bson.M{
						"input": "$plans",
						"as":    "plan",
						"in": bson.M{
							"$sum": bson.M{
								"$map": bson.M{
									"input": bson.M{
										"$filter": bson.M{
											"input": bson.M{"$ifNull": bson.A{"$$plan.installments", bson.A{}}},
											"as":    "inst",
											"cond":  bson.M{"$eq": bson.A{"$$inst.paid", true}},
										},
									},
									"as": "inst",
									"in": bson.M{"$ifNull": bson.A{"$$inst.amount", 0}},
								},
							},
						},
					},
				},
			},
			"total_remaining": bson.M{
				"$sum": bson.M{
					"$map": bson.M{
						"input": "$plans",
						"as":    "plan",
						"in": bson.M{
							"$sum": bson.M{
								"$map": bson.M{
									"input": bson.M{
										"$filter": bson.M{
											"input": bson.M{"$ifNull": bson.A{"$$plan.installments", bson.A{}}},
											"as":    "inst",
											"cond":  bson.M{"$eq": bson.A{"$$inst.paid", false}},
										},
									},
									"as": "inst",
									"in": bson.M{"$ifNull": bson.A{"$$inst.amount", 0}},
								},
							},
						},
					},
				},
			},
			"plan_count": bson.M{"$size": "$plans"},
		}}},
		{{Key: "$project", Value: bson.M{
			"customer_id":     bson.M{"$toString": "$_id"},
			"customer_name":   "$name",
			"customer_urdu":   "$name_urdu",
			"father_name":     "$father_name",
			"phone":           "$phone",
			"cnic":            "$cnic",
			"address":         "$address",
			"address_urdu":    "$address_urdu",
			"total_purchase":  1,
			"total_paid":      1,
			"total_remaining": 1,
			"plan_count":      1,
			"created_at":      bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$created_at"}},
		}}},
		{{Key: "$sort", Value: bson.M{"customer_name": 1}}},
	}

	cursor, err := db.Collection(config.ColCustomers).Aggregate(ctx, pipeline)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch customers with finance", "ناکام")
		return
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "ناکام")
		return
	}
	if results == nil {
		results = []bson.M{}
	}

	respondJSON(w, http.StatusOK, results)
}

// TodayDueDetails returns today's due installments
func (h *DashboardHandler) TodayDueDetails(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	ctx := r.Context()
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	todayEnd := todayStart.Add(24 * time.Hour)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"status": "active"}}},
		{{Key: "$unwind", Value: "$installments"}},
		{{Key: "$match", Value: bson.M{
			"installments.paid":     false,
			"installments.due_date": bson.M{"$gte": todayStart, "$lt": todayEnd},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColCustomers,
			"localField":   "customer_id",
			"foreignField": "_id",
			"as":           "customer",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$customer", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColProducts,
			"localField":   "product_id",
			"foreignField": "_id",
			"as":           "product",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$product", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$project", Value: bson.M{
			"plan_id":           bson.M{"$toString": "$_id"},
			"customer_id":       bson.M{"$toString": "$customer_id"},
			"customer_name":     "$customer.name",
			"customer_urdu":     "$customer.name_urdu",
			"father_name":       "$customer.father_name",
			"phone":             "$customer.phone",
			"cnic":              "$customer.cnic",
			"address":           "$customer.address",
			"address_urdu":      "$customer.address_urdu",
			"product_name":      "$product.name",
			"product_name_urdu": "$product.name_urdu",
			"installment_no":    "$installments.installment_no",
			"due_date":          bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$installments.due_date"}},
			"amount":            "$installments.amount",
			"fine":              "$installments.fine",
			"partial_paid":      "$installments.partial_paid",
			"paid":              "$installments.paid",
			"paid_date": bson.M{"$cond": bson.A{
				bson.M{"$ifNull": bson.A{"$installments.paid_date", false}},
				bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$installments.paid_date"}},
				"",
			}},
			"paid_count":         "$paid_count",
			"total_installments": "$num_installments",
			"remaining":          "$remaining",
			"total_amount":       "$total_amount",
			"down_payment":       "$down_payment",
			"remaining_amount":   "$remaining_amount",
			"is_overdue":         false,
		}}},
		{{Key: "$sort", Value: bson.M{"due_date": 1}}},
	}

	cursor, err := db.Collection(config.ColInstallments).Aggregate(ctx, pipeline)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch today's due", "ناکام")
		return
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "ناکام")
		return
	}
	if results == nil {
		results = []bson.M{}
	}

	respondJSON(w, http.StatusOK, results)
}

// LowStockDetails returns low stock inventory items
func (h *DashboardHandler) LowStockDetails(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	ctx := r.Context()

	findOptions := options.Find().SetSort(bson.M{"quantity": 1}).SetLimit(50)
	cursor, err := db.Collection(config.ColInventory).Find(ctx, bson.M{
		"quantity": bson.M{"$lte": 5},
		"status":   "in_stock",
	}, findOptions)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch low stock", "ناکام")
		return
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "ناکام")
		return
	}
	if results == nil {
		results = []bson.M{}
	}

	respondJSON(w, http.StatusOK, results)
}

// MonthlyDueDetails returns monthly due installments
func (h *DashboardHandler) MonthlyDueDetails(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	ctx := r.Context()
	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	monthEnd := monthStart.AddDate(0, 1, 0)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"status": "active"}}},
		{{Key: "$unwind", Value: "$installments"}},
		{{Key: "$match", Value: bson.M{
			"installments.paid":     false,
			"installments.due_date": bson.M{"$gte": monthStart, "$lt": monthEnd},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColCustomers,
			"localField":   "customer_id",
			"foreignField": "_id",
			"as":           "customer",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$customer", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColProducts,
			"localField":   "product_id",
			"foreignField": "_id",
			"as":           "product",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$product", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$project", Value: bson.M{
			"plan_id":           bson.M{"$toString": "$_id"},
			"customer_id":       bson.M{"$toString": "$customer_id"},
			"customer_name":     "$customer.name",
			"customer_urdu":     "$customer.name_urdu",
			"father_name":       "$customer.father_name",
			"phone":             "$customer.phone",
			"cnic":              "$customer.cnic",
			"address":           "$customer.address",
			"address_urdu":      "$customer.address_urdu",
			"product_name":      "$product.name",
			"product_name_urdu": "$product.name_urdu",
			"installment_no":    "$installments.installment_no",
			"due_date":          bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$installments.due_date"}},
			"amount":            "$installments.amount",
			"fine":              "$installments.fine",
			"partial_paid":      "$installments.partial_paid",
			"paid":              "$installments.paid",
			"paid_date": bson.M{"$cond": bson.A{
				bson.M{"$ifNull": bson.A{"$installments.paid_date", false}},
				bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$installments.paid_date"}},
				"",
			}},
			"paid_count":         "$paid_count",
			"total_installments": "$num_installments",
			"remaining":          "$remaining",
			"total_amount":       "$total_amount",
			"down_payment":       "$down_payment",
			"remaining_amount":   "$remaining_amount",
		}}},
		{{Key: "$sort", Value: bson.M{"due_date": 1}}},
	}

	cursor, err := db.Collection(config.ColInstallments).Aggregate(ctx, pipeline)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch monthly due", "ناکام")
		return
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "ناکام")
		return
	}
	if results == nil {
		results = []bson.M{}
	}

	respondJSON(w, http.StatusOK, results)
}

// TodayInstallments returns ALL unpaid installments that are due today OR overdue
// This is the TOP card on the dashboard
func (h *DashboardHandler) TodayInstallments(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	ctx := r.Context()
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	todayEnd := todayStart.Add(24 * time.Hour)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"status": "active"}}},
		{{Key: "$unwind", Value: "$installments"}},
		{{Key: "$match", Value: bson.M{
			"installments.paid": false,
			"$or": bson.A{
				// Due today
				bson.M{"installments.due_date": bson.M{"$gte": todayStart, "$lt": todayEnd}},
				// Overdue (due before today)
				bson.M{"installments.due_date": bson.M{"$lt": todayStart}},
			},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColCustomers,
			"localField":   "customer_id",
			"foreignField": "_id",
			"as":           "customer",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$customer", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColProducts,
			"localField":   "product_id",
			"foreignField": "_id",
			"as":           "product",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$product", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$project", Value: bson.M{
			"plan_id":           bson.M{"$toString": "$_id"},
			"customer_id":       bson.M{"$toString": "$customer_id"},
			"customer_name":     "$customer.name",
			"customer_urdu":     "$customer.name_urdu",
			"father_name":       "$customer.father_name",
			"phone":             "$customer.phone",
			"cnic":              "$customer.cnic",
			"address":           "$customer.address",
			"address_urdu":      "$customer.address_urdu",
			"product_name":      "$product.name",
			"product_name_urdu": "$product.name_urdu",
			"installment_no":    "$installments.installment_no",
			"due_date":          bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$installments.due_date"}},
			"amount":            "$installments.amount",
			"fine":              "$installments.fine",
			"partial_paid":      "$installments.partial_paid",
			"paid":              "$installments.paid",
			"paid_date": bson.M{"$cond": bson.A{
				bson.M{"$ifNull": bson.A{"$installments.paid_date", false}},
				bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$installments.paid_date"}},
				"",
			}},
			"paid_count":         "$paid_count",
			"total_installments": "$num_installments",
			"remaining":          "$remaining",
			"total_amount":       "$total_amount",
			"down_payment":       "$down_payment",
			"remaining_amount":   "$remaining_amount",
			"is_overdue": bson.M{
				"$cond": bson.A{
					bson.M{"$lt": bson.A{"$installments.due_date", todayStart}},
					true,
					false,
				},
			},
		}}},
		{{Key: "$sort", Value: bson.M{"is_overdue": -1, "due_date": 1}}},
	}

	cursor, err := db.Collection(config.ColInstallments).Aggregate(ctx, pipeline)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch today's installments", "ناکام")
		return
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "ناکام")
		return
	}
	if results == nil {
		results = []bson.M{}
	}

	respondJSON(w, http.StatusOK, results)
}
