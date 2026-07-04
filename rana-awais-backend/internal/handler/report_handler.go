package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)


// ReportHandler handles all report endpoints
type ReportHandler struct{}

func NewReportHandler() *ReportHandler {
	return &ReportHandler{}
}

// DailyReport - returns all transactions for a specific date
func (h *ReportHandler) DailyReport(w http.ResponseWriter, r *http.Request) {
	dateStr := r.URL.Query().Get("date")
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid date format", "غلط تاریخ")
		return
	}

	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	db := config.DB
	paymentsColl := db.Collection(config.ColPayments)

	// Get all payments for this date
	paymentsPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"transaction_date": bson.M{"$gte": startOfDay, "$lt": endOfDay},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColInstallments,
			"localField":   "installment_plan_id",
			"foreignField": "_id",
			"as":           "plan",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$plan", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColCustomers,
			"localField":   "plan.customer_id",
			"foreignField": "_id",
			"as":           "customer",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$customer", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColProducts,
			"localField":   "plan.product_id",
			"foreignField": "_id",
			"as":           "product",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$product", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$project", Value: bson.M{
			"id":                bson.M{"$toString": "$_id"},
			"customer_name":     "$customer.name",
			"customer_urdu":     "$customer.name_urdu",
			"father_name":       "$customer.father_name",
			"phone":             "$customer.phone",
			"product_name":      "$product.name",
			"product_name_urdu": "$product.name_urdu",
			"amount":            "$amount",
			"fine_paid":         "$fine_paid",
			"method":            "$method",
			"status":            "paid",
			"date":              bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$transaction_date"}},
			"installment_no":    "$installment_no",
			"collected_by":      "$collected_by",
		}}},
		{{Key: "$sort", Value: bson.M{"date": -1}}},
	}

	cursor, err := paymentsColl.Aggregate(r.Context(), paymentsPipeline)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch daily report", "روزانہ رپورٹ نہیں آئی")
		return
	}
	defer cursor.Close(r.Context())

	var transactions []bson.M
	if err = cursor.All(r.Context(), &transactions); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "نتائج پڑھنے میں ناکامی")
		return
	}
	if transactions == nil {
		transactions = []bson.M{}
	}

	// Calculate totals
	var totalCollected float64
	var totalInstallments, totalCustomers int
	customerSet := make(map[string]bool)

	for _, t := range transactions {
		amount, _ := t["amount"].(float64)
		totalCollected += amount
		totalInstallments++

		if name, ok := t["customer_name"].(string); ok && name != "" {
			customerSet[name] = true
		}
	}
	totalCustomers = len(customerSet)

	// Get pending installments for this date
	totalPending := h.getPendingTotal(r.Context(), startOfDay, endOfDay)

	// Get total sales
	totalSales := h.getTotalSales(r.Context(), startOfDay, endOfDay, totalCollected)

	// Calculate additional report fields
	cashInHand := totalCollected // Cash collected today
	bankDeposit := 0.0           // Will be calculated from payments with method="bank"
	recoveryRate := 0.0
	if totalSales > 0 {
		recoveryRate = (totalCollected / totalSales) * 100
	}
	openAccounts := totalCustomers
	closedAccounts := 0
	netAccounts := openAccounts - closedAccounts
	totalOutstanding := totalPending

	// Get bank deposits from payments
	bankPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"transaction_date": bson.M{"$gte": startOfDay, "$lt": endOfDay},
			"method":           bson.M{"$in": bson.A{"bank", "jazzcash", "easypaisa"}},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$amount"},
		}}},
	}
	bankCursor, err := db.Collection(config.ColPayments).Aggregate(r.Context(), bankPipeline)
	if err == nil {
		var bankResults []struct {
			Total float64 `bson:"total"`
		}
		if bankCursor.All(r.Context(), &bankResults) == nil && len(bankResults) > 0 {
			bankDeposit = bankResults[0].Total
		}
		bankCursor.Close(r.Context())
	}
	if bankDeposit > 0 {
		cashInHand = totalCollected - bankDeposit
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"date":               dateStr,
		"dayName":            date.Weekday().String(),
		"totalSales":         totalSales,
		"totalInstallments":  totalInstallments,
		"totalCollected":     totalCollected,
		"totalPending":       totalPending,
		"totalCustomers":     totalCustomers,
		"cashInHand":         cashInHand,
		"bankDeposit":        bankDeposit,
		"recoveryRate":       recoveryRate,
		"openAccounts":       openAccounts,
		"closedAccounts":     closedAccounts,
		"netAccounts":        netAccounts,
		"totalOutstanding":   totalOutstanding,
		"transactions":       transactions,
	})
}

// WeeklyReport - returns all transactions for the past 7 days
func (h *ReportHandler) WeeklyReport(w http.ResponseWriter, r *http.Request) {
	startStr := r.URL.Query().Get("startDate")
	endStr := r.URL.Query().Get("endDate")

	now := time.Now()
	var start, end time.Time

	if startStr != "" && endStr != "" {
		var err error
		start, err = time.Parse("2006-01-02", startStr)
		if err != nil {
			respondError(w, r, http.StatusBadRequest, "Invalid start date", "غلط تاریخ")
			return
		}
		end, err = time.Parse("2006-01-02", endStr)
		if err != nil {
			respondError(w, r, http.StatusBadRequest, "Invalid end date", "غلط تاریخ")
			return
		}
		end = end.Add(24 * time.Hour)
	} else {
		start = now.AddDate(0, 0, -7)
		end = now.Add(24 * time.Hour)
	}

	h.generateDateRangeReport(w, r, start, end)
}

// MonthlyReport - returns all transactions for the past 30 days
func (h *ReportHandler) MonthlyReport(w http.ResponseWriter, r *http.Request) {
	startStr := r.URL.Query().Get("startDate")
	endStr := r.URL.Query().Get("endDate")

	now := time.Now()
	var start, end time.Time

	if startStr != "" && endStr != "" {
		var err error
		start, err = time.Parse("2006-01-02", startStr)
		if err != nil {
			respondError(w, r, http.StatusBadRequest, "Invalid start date", "غلط تاریخ")
			return
		}
		end, err = time.Parse("2006-01-02", endStr)
		if err != nil {
			respondError(w, r, http.StatusBadRequest, "Invalid end date", "غلط تاریخ")
			return
		}
		end = end.Add(24 * time.Hour)
	} else {
		start = now.AddDate(0, -1, 0)
		end = now.Add(24 * time.Hour)
	}

	h.generateDateRangeReport(w, r, start, end)
}

// DateRangeReport - returns all transactions for a custom date range
func (h *ReportHandler) DateRangeReport(w http.ResponseWriter, r *http.Request) {
	startStr := r.URL.Query().Get("startDate")
	endStr := r.URL.Query().Get("endDate")

	if startStr == "" || endStr == "" {
		respondError(w, r, http.StatusBadRequest, "startDate and endDate are required", "تاریخ درکار ہے")
		return
	}

	start, err := time.Parse("2006-01-02", startStr)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid start date", "غلط تاریخ")
		return
	}

	end, err := time.Parse("2006-01-02", endStr)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid end date", "غلط تاریخ")
		return
	}
	end = end.Add(24 * time.Hour)

	h.generateDateRangeReport(w, r, start, end)
}

// generateDateRangeReport - shared logic for date range reports
func (h *ReportHandler) generateDateRangeReport(w http.ResponseWriter, r *http.Request, start, end time.Time) {
	db := config.DB
	paymentsColl := db.Collection(config.ColPayments)

	paymentsPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"transaction_date": bson.M{"$gte": start, "$lt": end},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColInstallments,
			"localField":   "installment_plan_id",
			"foreignField": "_id",
			"as":           "plan",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$plan", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColCustomers,
			"localField":   "plan.customer_id",
			"foreignField": "_id",
			"as":           "customer",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$customer", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColProducts,
			"localField":   "plan.product_id",
			"foreignField": "_id",
			"as":           "product",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$product", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$project", Value: bson.M{
			"id":                bson.M{"$toString": "$_id"},
			"customer_name":     "$customer.name",
			"customer_urdu":     "$customer.name_urdu",
			"father_name":       "$customer.father_name",
			"phone":             "$customer.phone",
			"product_name":      "$product.name",
			"product_name_urdu": "$product.name_urdu",
			"amount":            "$amount",
			"fine_paid":         "$fine_paid",
			"method":            "$method",
			"status":            "paid",
			"date":              bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$transaction_date"}},
			"installment_no":    "$installment_no",
			"collected_by":      "$collected_by",
		}}},
		{{Key: "$sort", Value: bson.M{"date": -1}}},
	}

	cursor, err := paymentsColl.Aggregate(r.Context(), paymentsPipeline)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch report", "رپورٹ نہیں آئی")
		return
	}
	defer cursor.Close(r.Context())

	var transactions []bson.M
	if err = cursor.All(r.Context(), &transactions); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "نتائج پڑھنے میں ناکامی")
		return
	}
	if transactions == nil {
		transactions = []bson.M{}
	}

	var totalCollected float64
	var totalInstallments, totalCustomers int
	customerSet := make(map[string]bool)

	for _, t := range transactions {
		amount, _ := t["amount"].(float64)
		totalCollected += amount
		totalInstallments++

		if name, ok := t["customer_name"].(string); ok && name != "" {
			customerSet[name] = true
		}
	}
	totalCustomers = len(customerSet)

	totalPending := h.getPendingTotal(r.Context(), start, end)
	totalSales := h.getTotalSales(r.Context(), start, end, totalCollected)

	// Calculate additional report fields
	cashInHand := totalCollected
	bankDeposit := 0.0
	recoveryRate := 0.0
	if totalSales > 0 {
		recoveryRate = (totalCollected / totalSales) * 100
	}
	openAccounts := totalCustomers
	closedAccounts := 0
	netAccounts := openAccounts - closedAccounts
	totalOutstanding := totalPending

	// Get bank deposits from payments
	bankPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"transaction_date": bson.M{"$gte": start, "$lt": end},
			"method":           bson.M{"$in": bson.A{"bank", "jazzcash", "easypaisa"}},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$amount"},
		}}},
	}
	bankCursor, err := db.Collection(config.ColPayments).Aggregate(r.Context(), bankPipeline)
	if err == nil {
		var bankResults []struct {
			Total float64 `bson:"total"`
		}
		if bankCursor.All(r.Context(), &bankResults) == nil && len(bankResults) > 0 {
			bankDeposit = bankResults[0].Total
		}
		bankCursor.Close(r.Context())
	}
	if bankDeposit > 0 {
		cashInHand = totalCollected - bankDeposit
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"startDate":         start.Format("2006-01-02"),
		"endDate":           end.Add(-24 * time.Hour).Format("2006-01-02"),
		"totalSales":        totalSales,
		"totalInstallments": totalInstallments,
		"totalCollected":    totalCollected,
		"totalPending":      totalPending,
		"totalCustomers":    totalCustomers,
		"cashInHand":        cashInHand,
		"bankDeposit":       bankDeposit,
		"recoveryRate":      recoveryRate,
		"openAccounts":      openAccounts,
		"closedAccounts":    closedAccounts,
		"netAccounts":       netAccounts,
		"totalOutstanding":  totalOutstanding,
		"transactions":      transactions,
	})
}

// CustomerReport - returns all customers with their installment details
// OPTIMIZED: Uses aggregation pipeline instead of N+1 queries
func (h *ReportHandler) CustomerReport(w http.ResponseWriter, r *http.Request) {
	db := config.DB

	type CustomerReportItem struct {
		ID                string  `json:"id"`
		Name              string  `json:"name"`
		NameUrdu          string  `json:"nameUrdu"`
		FatherName        string  `json:"fatherName"`
		Phone             string  `json:"phone"`
		CNIC              string  `json:"cnic"`
		Address           string  `json:"address"`
		TotalPlans        int     `json:"totalPlans"`
		TotalAmount       float64 `json:"totalAmount"`
		TotalPaid         float64 `json:"totalPaid"`
		TotalPending      float64 `json:"totalPending"`
		TotalInstallments int     `json:"totalInstallments"`
		PaidInstallments  int     `json:"paidInstallments"`
		Status            string  `json:"status"`
	}

	// OPTIMIZED: Use aggregation with $lookup to avoid N+1 queries
	pipeline := mongo.Pipeline{
		{{Key: "$sort", Value: bson.M{"name": 1}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColInstallments,
			"localField":   "_id",
			"foreignField": "customer_id",
			"as":           "plans",
		}}},
		{{Key: "$addFields", Value: bson.M{
			"totalPlans":        bson.M{"$size": "$plans"},
			"totalAmount":       bson.M{"$sum": "$plans.total_amount"},
			"totalInstallments": bson.M{"$sum": bson.M{"$map": bson.M{"input": "$plans", "as": "plan", "in": bson.M{"$size": bson.M{"$ifNull": bson.A{"$$plan.installments", bson.A{}}}}}}},
			"paidInstallments": bson.M{"$sum": bson.M{
				"$map": bson.M{
					"input": "$plans",
					"as":    "plan",
					"in": bson.M{
						"$size": bson.M{
							"$filter": bson.M{
								"input": bson.M{"$ifNull": bson.A{"$$plan.installments", bson.A{}}},
								"as":    "inst",
								"cond":  bson.M{"$eq": bson.A{"$$inst.paid", true}},
							},
						},
					},
				},
			}},
			"totalPaid": bson.M{"$sum": bson.M{
				"$map": bson.M{
					"input": "$plans",
					"as":    "plan",
					"in": bson.M{
						"$sum": bson.M{
							"$map": bson.M{
								"input": bson.M{"$ifNull": bson.A{"$$plan.installments", bson.A{}}},
								"as":    "inst",
								"in": bson.M{
									"$cond": bson.A{
										bson.M{"$eq": bson.A{"$$inst.paid", true}},
										bson.M{"$ifNull": bson.A{"$$inst.amount", 0}},
										0,
									},
								},
							},
						},
					},
				},
			}},
			"totalPending": bson.M{"$sum": bson.M{
				"$map": bson.M{
					"input": "$plans",
					"as":    "plan",
					"in": bson.M{
						"$sum": bson.M{
							"$map": bson.M{
								"input": bson.M{"$ifNull": bson.A{"$$plan.installments", bson.A{}}},
								"as":    "inst",
								"in": bson.M{
									"$cond": bson.A{
										bson.M{"$eq": bson.A{"$$inst.paid", false}},
										bson.M{"$add": bson.A{
											bson.M{"$ifNull": bson.A{"$$inst.amount", 0}},
											bson.M{"$ifNull": bson.A{"$$inst.fine", 0}},
										}},
										0,
									},
								},
							},
						},
					},
				},
			}},
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":               0,
			"id":                bson.M{"$toString": "$_id"},
			"name":              bson.M{"$ifNull": bson.A{"$name", ""}},
			"nameUrdu":          bson.M{"$ifNull": bson.A{"$name_urdu", ""}},
			"fatherName":        bson.M{"$ifNull": bson.A{"$father_name", ""}},
			"phone":             bson.M{"$ifNull": bson.A{"$phone", ""}},
			"cnic":              bson.M{"$ifNull": bson.A{"$cnic", ""}},
			"address":           bson.M{"$ifNull": bson.A{"$address", ""}},
			"totalPlans":        1,
			"totalAmount":       1,
			"totalPaid":         1,
			"totalPending":      1,
			"totalInstallments": 1,
			"paidInstallments":  1,
			"status": bson.M{
				"$cond": bson.A{
					bson.M{"$and": bson.A{
						bson.M{"$eq": bson.A{"$totalPending", 0}},
						bson.M{"$gt": bson.A{"$totalPlans", 0}},
					}},
					"completed",
					"active",
				},
			},
		}}},
	}

	cursor, err := db.Collection(config.ColCustomers).Aggregate(r.Context(), pipeline)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch customer report", "گاہک رپورٹ نہیں آئی")
		return
	}
	defer cursor.Close(r.Context())

	var result []CustomerReportItem
	if err = cursor.All(r.Context(), &result); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "نتائج پڑھنے میں ناکامی")
		return
	}
	if result == nil {
		result = []CustomerReportItem{}
	}

	respondJSON(w, http.StatusOK, result)
}

// ✅ Helper methods

func (h *ReportHandler) getPendingTotal(ctx context.Context, start, end time.Time) float64 {
	db := config.DB
	installmentsColl := db.Collection(config.ColInstallments)

	pendingPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"status": "active"}}},
		{{Key: "$unwind", Value: "$installments"}},
		{{Key: "$match", Value: bson.M{
			"installments.paid":     false,
			"installments.due_date": bson.M{"$gte": start, "$lt": end},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": nil,
			"total_pending": bson.M{"$sum": bson.M{
				"$subtract": bson.A{
					bson.M{"$add": bson.A{"$installments.amount", "$installments.fine"}},
					"$installments.partial_paid",
				},
			}},
		}}},
	}

	pendingCursor, err := installmentsColl.Aggregate(ctx, pendingPipeline)
	if err != nil {
		return 0
	}
	defer pendingCursor.Close(ctx)

	var pendingResults []struct {
		TotalPending float64 `bson:"total_pending"`
	}
	if pendingCursor.All(ctx, &pendingResults) == nil && len(pendingResults) > 0 {
		return pendingResults[0].TotalPending
	}
	return 0
}

func (h *ReportHandler) getTotalSales(ctx context.Context, start, end time.Time, existingTotal float64) float64 {
	db := config.DB
	installmentsColl := db.Collection(config.ColInstallments)

	salesPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"created_at": bson.M{"$gte": start, "$lt": end},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$total_amount"},
		}}},
	}

	salesCursor, err := installmentsColl.Aggregate(ctx, salesPipeline)
	if err != nil {
		return existingTotal
	}
	defer salesCursor.Close(ctx)

	var salesResults []struct {
		Total float64 `bson:"total"`
	}
	if salesCursor.All(ctx, &salesResults) == nil && len(salesResults) > 0 {
		return salesResults[0].Total
	}
	return 0
}
