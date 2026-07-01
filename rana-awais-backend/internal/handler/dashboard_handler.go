package handler

import (
	"context"
	"net/http
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// DashboardHandler handles dashboard summary endpoints
type DashboardHandler struct{}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{}
}

// Summary returns all dashboard card data in a single API call
func (h *DashboardHandler) Summary(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	ctx := r.Context()

	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	todayEnd := todayStart.Add(24 * time.Hour)
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	monthEnd := monthStart.AddDate(0, 1, 0)

	// Run all queries concurrently
	type result struct {
		key  string
		data interface{}
		err  error
	}

	ch := make(chan result, 15)

	// 1. Today's Collection (also used as todayRevenue)
	go func() {
		total, count, err := getTodayCollection(ctx, db, todayStart, todayEnd)
		ch <- result{"todayCollection", map[string]interface{}{"total": total, "count": count}, err}
	}()

	// 2. Total Pending Amount (also used as pendingTotal)
	go func() {
		total, err := getTotalPending(ctx, db)
		ch <- result{"totalPending", total, err}
	}()

	// 3. Total Paid Amount
	go func() {
		total, err := getTotalPaid(ctx, db)
		ch <- result{"totalPaid", total, err}
	}()

	// 4. Total Customers
	go func() {
		count, err := db.Collection(config.ColCustomers).CountDocuments(ctx, bson.M{})
		ch <- result{"totalCustomers", count, err}
	}()

	// 5. Active Installments (also used as activePlans)
	go func() {
		count, err := db.Collection(config.ColInstallments).CountDocuments(ctx, bson.M{"status": "active"})
		ch <- result{"activeInstallments", count, err}
	}()

	// 6. Completed Installments
	go func() {
		count, err := db.Collection(config.ColInstallments).CountDocuments(ctx, bson.M{"status": "completed"})
		ch <- result{"completedInstallments", count, err}
	}()

	// 7. Overdue Customers
	go func() {
		count, err := getOverdueCount(ctx, db, todayStart)
		ch <- result{"overdueCustomers", count, err}
	}()

	// 8. Today's Due Customers
	go func() {
		count, err := getTodayDueCount(ctx, db, todayStart, todayEnd)
		ch <- result{"todayDue", count, err}
	}()

	// 9. Total Products
	go func() {
		count, err := db.Collection(config.ColProducts).CountDocuments(ctx, bson.M{})
		ch <- result{"totalProducts", count, err}
	}()

	// 10. Low Stock Items - count items with status "in_stock" (no quantity field exists)
	go func() {
		count, err := db.Collection(config.ColInventory).CountDocuments(ctx, bson.M{"status": "in_stock"})
		ch <- result{"lowStockItems", count, err}
	}()

	// 11. Total Inventory Value
	go func() {
		total, err := getInventoryValue(ctx, db)
		ch <- result{"inventoryValue", total, err}
	}()

	// 12. Ageing Stock
	go func() {
		count, err := db.Collection(config.ColInventory).CountDocuments(ctx, bson.M{"ageing_days": bson.M{"$gte": 90}})
		ch <- result{"ageingStock", count, err}
	}()

	// 13. Today's Profit (Revenue - Estimated COGS, ~30% margin approximation)
	go func() {
		profit, err := getTodayProfit(ctx, db, todayStart, todayEnd)
		ch <- result{"todayProfit", profit, err}
	}()

	// 14. Month Revenue (sum of payments this month)
	go func() {
		revenue, err := getMonthRevenue(ctx, db, monthStart, monthEnd)
		ch <- result{"monthRevenue", revenue, err}
	}()

	// 15. Month Profit (Revenue - Estimated COGS, ~30% margin approximation)
	go func() {
		profit, err := getMonthProfit(ctx, db, monthStart, monthEnd)
		ch <- result{"monthProfit", profit, err}
	}()


	// Collect all results (15 goroutines - duplicates removed)
	results := make(map[string]interface{})
	for i := 0; i < 15; i++ {
		res := <-ch
		if res.err == nil {
			results[res.key] = res.data
		}
	}

	// Add aliases for frontend compatibility
	if val, ok := results["todayCollection"]; ok {
		if m, ok := val.(map[string]interface{}); ok {
			if total, ok := m["total"].(float64); ok {
				results["todayRevenue"] = total
			}
		}
	}
	if val, ok := results["totalPending"]; ok {
		results["pendingTotal"] = val
	}
	if val, ok := results["activeInstallments"]; ok {
		results["activePlans"] = val
	}

	respondJSON(w, http.StatusOK, results)
}

// Helper functions

func getTodayCollection(ctx context.Context, db *mongo.Database, start, end time.Time) (float64, int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"transaction_date": bson.M{"$gte": start, "$lt": end},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$amount"},
			"count": bson.M{"$sum": 1},
		}}},
	}
	cursor, err := db.Collection(config.ColPayments).Aggregate(ctx, pipeline)
	if err != nil {
		return 0, 0, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		Total float64 `bson:"total"`
		Count int64   `bson:"count"`
	}
	if cursor.All(ctx, &results) == nil && len(results) > 0 {
		return results[0].Total, results[0].Count, nil
	}
	return 0, 0, nil
}

func getTotalPending(ctx context.Context, db *mongo.Database) (float64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"status": "active"}}},
		{{Key: "$unwind", Value: "$installments"}},
		{{Key: "$match", Value: bson.M{"installments.paid": false}}},
		{{Key: "$group", Value: bson.M{
			"_id": nil,
			"total": bson.M{"$sum": bson.M{
				"$subtract": bson.A{
					bson.M{"$add": bson.A{"$installments.amount", "$installments.fine"}},
					"$installments.partial_paid",
				},
			}},
		}}},
	}
	cursor, err := db.Collection(config.ColInstallments).Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		Total float64 `bson:"total"`
	}
	if cursor.All(ctx, &results) == nil && len(results) > 0 {
		if results[0].Total < 0 {
			return 0, nil
		}
		return results[0].Total, nil
	}
	return 0, nil
}

func getTotalPaid(ctx context.Context, db *mongo.Database) (float64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$amount"},
		}}},
	}
	cursor, err := db.Collection(config.ColPayments).Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		Total float64 `bson:"total"`
	}
	if cursor.All(ctx, &results) == nil && len(results) > 0 {
		return results[0].Total, nil
	}
	return 0, nil
}

func getOverdueCount(ctx context.Context, db *mongo.Database, today time.Time) (int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"status": "active"}}},
		{{Key: "$unwind", Value: "$installments"}},
		{{Key: "$match", Value: bson.M{
			"installments.paid":     false,
			"installments.due_date": bson.M{"$lt": today},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": "$customer_id",
		}}},
		{{Key: "$count", Value: "count"}},
	}
	cursor, err := db.Collection(config.ColInstallments).Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		Count int64 `bson:"count"`
	}
	if cursor.All(ctx, &results) == nil && len(results) > 0 {
		return results[0].Count, nil
	}
	return 0, nil
}

func getTodayDueCount(ctx context.Context, db *mongo.Database, start, end time.Time) (int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"status": "active"}}},
		{{Key: "$unwind", Value: "$installments"}},
		{{Key: "$match", Value: bson.M{
			"installments.paid":     false,
			"installments.due_date": bson.M{"$gte": start, "$lt": end},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": "$customer_id",
		}}},
		{{Key: "$count", Value: "count"}},
	}
	cursor, err := db.Collection(config.ColInstallments).Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		Count int64 `bson:"count"`
	}
	if cursor.All(ctx, &results) == nil && len(results) > 0 {
		return results[0].Count, nil
	}
	return 0, nil
}

func getInventoryValue(ctx context.Context, db *mongo.Database) (float64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"status": "in_stock"}}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$purchasePrice"},
		}}},
	}
	cursor, err := db.Collection(config.ColInventory).Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		Total float64 `bson:"total"`
	}
	if cursor.All(ctx, &results) == nil && len(results) > 0 {
		return results[0].Total, nil
	}
	return 0, nil
}

func getTodayRevenue(ctx context.Context, db *mongo.Database, start, end time.Time) (float64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"transaction_date": bson.M{"$gte": start, "$lt": end},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$amount"},
		}}},
	}
	cursor, err := db.Collection(config.ColPayments).Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		Total float64 `bson:"total"`
	}
	if cursor.All(ctx, &results) == nil && len(results) > 0 {
		return results[0].Total, nil
	}
	return 0, nil
}

func getTodayProfit(ctx context.Context, db *mongo.Database, start, end time.Time) (float64, error) {
	// Profit = Today's Revenue - Cost of Goods Sold
	// First get today's total revenue from payments
	revenuePipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"transaction_date": bson.M{"$gte": start, "$lt": end},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$amount"},
		}}},
	}
	revCursor, err := db.Collection(config.ColPayments).Aggregate(ctx, revenuePipeline)
	if err != nil {
		return 0, err
	}
	defer revCursor.Close(ctx)

	var revResults []struct {
		Total float64 `bson:"total"`
	}
	todayRevenue := 0.0
	if revCursor.All(ctx, &revResults) == nil && len(revResults) > 0 {
		todayRevenue = revResults[0].Total
	}

	// If revenue is 0, profit must also be 0
	if todayRevenue == 0 {
		return 0, nil
	}

	// Then get cost of goods sold today from inventory
	cogsPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"status": "sold",
			"sold_date": bson.M{"$gte": start, "$lt": end},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$purchase_price"},
		}}},
	}
	cogsCursor, err := db.Collection(config.ColInventory).Aggregate(ctx, cogsPipeline)
	if err != nil {
		// If can't get COGS, estimate profit as 30% of revenue
		return todayRevenue * 0.30, nil
	}
	defer cogsCursor.Close(ctx)

	var cogsResults []struct {
		Total float64 `bson:"total"`
	}
	cogs := 0.0
	if cogsCursor.All(ctx, &cogsResults) == nil && len(cogsResults) > 0 {
		cogs = cogsResults[0].Total
	}

	profit := todayRevenue - cogs
	if profit < 0 {
		profit = 0
	}
	// Profit cannot exceed revenue
	if profit > todayRevenue {
		profit = todayRevenue
	}
	return profit, nil
}


func getMonthRevenue(ctx context.Context, db *mongo.Database, start, end time.Time) (float64, error) {
	// Month Revenue = sum of all payments made this month
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"transaction_date": bson.M{"$gte": start, "$lt": end},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$amount"},
		}}},
	}
	cursor, err := db.Collection(config.ColPayments).Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		Total float64 `bson:"total"`
	}
	if cursor.All(ctx, &results) == nil && len(results) > 0 {
		return results[0].Total, nil
	}
	return 0, nil
}

func getMonthProfit(ctx context.Context, db *mongo.Database, start, end time.Time) (float64, error) {
	// Month Profit = Month Revenue - Cost of Goods Sold for items sold this month
	// First get month's total revenue from payments
	revenuePipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"transaction_date": bson.M{"$gte": start, "$lt": end},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$amount"},
		}}},
	}
	revCursor, err := db.Collection(config.ColPayments).Aggregate(ctx, revenuePipeline)
	if err != nil {
		return 0, err
	}
	defer revCursor.Close(ctx)

	var revResults []struct {
		Total float64 `bson:"total"`
	}
	monthRevenue := 0.0
	if revCursor.All(ctx, &revResults) == nil && len(revResults) > 0 {
		monthRevenue = revResults[0].Total
	}

	// If revenue is 0, profit must also be 0
	if monthRevenue == 0 {
		return 0, nil
	}

	// Then get cost of goods sold this month from inventory
	cogsPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"status": "sold",
			"sold_date": bson.M{"$gte": start, "$lt": end},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$purchase_price"},
		}}},
	}
	cogsCursor, err := db.Collection(config.ColInventory).Aggregate(ctx, cogsPipeline)
	if err != nil {
		// If can't get COGS, estimate profit as 30% of revenue
		return monthRevenue * 0.30, nil
	}
	defer cogsCursor.Close(ctx)

	var cogsResults []struct {
		Total float64 `bson:"total"`
	}
	cogs := 0.0
	if cogsCursor.All(ctx, &cogsResults) == nil && len(cogsResults) > 0 {
		cogs = cogsResults[0].Total
	}

	profit := monthRevenue - cogs
	if profit < 0 {
		profit = 0
	}
	if profit > monthRevenue {
		profit = monthRevenue
	}
	return profit, nil
}


// OverdueDetails returns detailed overdue customer info
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
		{{Key: "$project", Value: bson.M{
			"id":             bson.M{"$toString": "$_id"},
			"customer_name":  "$customer.name",
			"customer_urdu":  "$customer.name_urdu",
			"father_name":    "$customer.father_name",
			"phone":          "$customer.phone",
			"installment_no": "$installments.installment_no",
			"due_date":       bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$installments.due_date"}},
			"amount":         "$installments.amount",
			"fine":           "$installments.fine",
			"partial_paid":   "$installments.partial_paid",
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

// TodayDueDetails returns customers with installments due today
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
		{{Key: "$project", Value: bson.M{
			"id":             bson.M{"$toString": "$_id"},
			"customer_name":  "$customer.name",
			"customer_urdu":  "$customer.name_urdu",
			"father_name":    "$customer.father_name",
			"phone":          "$customer.phone",
			"installment_no": "$installments.installment_no",
			"due_date":       bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$installments.due_date"}},
			"amount":         "$installments.amount",
		}}},
		{{Key: "$sort", Value: bson.M{"due_date": 1}}},
	}

	cursor, err := db.Collection(config.ColInstallments).Aggregate(ctx, pipeline)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch today's due details", "ناکام")
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

// LowStockDetails returns items with low stock
func (h *DashboardHandler) LowStockDetails(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	ctx := r.Context()

	cursor, err := db.Collection(config.ColInventory).Find(ctx, bson.M{"status": "in_stock"}, nil)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch low stock items", "ناکام")
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

// TodayDueFull returns complete details of installments due today with full customer info
func (h *DashboardHandler) TodayDueFull(w http.ResponseWriter, r *http.Request) {
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
			"total_installments": "$num_installments",
		}}},
		{{Key: "$project", Value: bson.M{
			"plan_id":            bson.M{"$toString": "$_id"},
			"customer_id":        bson.M{"$toString": "$customer_id"},
			"customer_name":      "$customer.name",
			"customer_urdu":      "$customer.name_urdu",
			"father_name":        "$customer.father_name",
			"phone":              "$customer.phone",
			"cnic":               "$customer.cnic",
			"address":            "$customer.address",
			"address_urdu":       "$customer.address_urdu",
			"product_name":       "$product.name",
			"product_name_urdu":  "$product.name_urdu",
			"installment_no":     "$installments.installment_no",
			"due_date":           bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$installments.due_date"}},
			"amount":             "$installments.amount",
			"fine":               "$installments.fine",
			"partial_paid":       "$installments.partial_paid",
			"paid":               "$installments.paid",
			"paid_date": bson.M{"$cond": bson.A{
				bson.M{"$ifNull": bson.A{"$installments.paid_date", false}},
				bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$installments.paid_date"}},
				"",
			}},
			"paid_count":         1,
			"total_installments": 1,
			"remaining":          bson.M{"$subtract": bson.A{"$num_installments", bson.M{"$size": bson.M{"$filter": bson.M{"input": "$installments", "as": "inst", "cond": bson.M{"$eq": bson.A{"$$inst.paid", true}}}}}}},
			"total_amount":       "$total_amount",
			"down_payment":       "$down_payment",
			"remaining_amount":   "$remaining_amount",
		}}},
		{{Key: "$sort", Value: bson.M{"due_date": 1}}},
	}

	cursor, err := db.Collection(config.ColInstallments).Aggregate(ctx, pipeline)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch today's due details", "ناکام")
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

// OverdueFull returns complete details of overdue installments with full customer info
func (h *DashboardHandler) OverdueFull(w http.ResponseWriter, r *http.Request) {
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
		{{Key: "$project", Value: bson.M{
			"id":             bson.M{"$toString": "$_id"},
			"customer_name":  "$customer.name",
			"customer_urdu":  "$customer.name_urdu",
			"father_name":    "$customer.father_name",
			"phone":          "$customer.phone",
			"installment_no": "$installments.installment_no",
			"due_date":       bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$installments.due_date"}},
			"amount":         "$installments.amount",
			"fine":           "$installments.fine",
			"partial_paid":   "$installments.partial_paid",
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

// RecentActivities returns recent system activities
func (h *DashboardHandler) RecentActivities(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	ctx := r.Context()

	// Sort by timestamp descending, limit to 50 most recent
	findOptions := options.Find().SetSort(bson.M{"timestamp": -1}).SetLimit(50)
	cursor, err := db.Collection(config.ColAuditLogs).Find(ctx, bson.M{}, findOptions)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch activities", "ناکام")
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
