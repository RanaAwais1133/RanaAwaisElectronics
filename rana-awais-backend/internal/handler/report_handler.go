package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/your-org/rana-awais-backend/config"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
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

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"date":              dateStr,
		"dayName":           date.Weekday().String(),
		"totalSales":        totalSales,
		"totalInstallments": totalInstallments,
		"totalCollected":    totalCollected,
		"totalPending":      totalPending,
		"totalCustomers":    totalCustomers,
		"transactions":      transactions,
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

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"startDate":         start.Format("2006-01-02"),
		"endDate":           end.Add(-24 * time.Hour).Format("2006-01-02"),
		"totalSales":        totalSales,
		"totalInstallments": totalInstallments,
		"totalCollected":    totalCollected,
		"totalPending":      totalPending,
		"totalCustomers":    totalCustomers,
		"transactions":      transactions,
	})
}

// CustomerReport - returns all customers with their installment details
func (h *ReportHandler) CustomerReport(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	customersColl := db.Collection(config.ColCustomers)
	installmentsColl := db.Collection(config.ColInstallments)

	cursor, err := customersColl.Find(r.Context(), bson.M{}, options.Find().SetSort(bson.M{"name": 1}))
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch customers", "گاہک نہیں لائے جا سکے")
		return
	}
	defer cursor.Close(r.Context())

	var customers []bson.M
	if err = cursor.All(r.Context(), &customers); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to parse customers", "گاہک پڑھنے میں ناکامی")
		return
	}

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

	var result []CustomerReportItem
	for _, c := range customers {
		custID, ok := c["_id"].(primitive.ObjectID)
		if !ok {
			continue
		}

		planCursor, err := installmentsColl.Find(r.Context(), bson.M{"customer_id": custID})
		if err != nil {
			continue
		}

		var plans []bson.M
		planCursor.All(r.Context(), &plans)
		planCursor.Close(r.Context())

		totalPlans := len(plans)
		var totalAmount, totalPaid, totalPending float64
		var totalInstallments, paidInstallments int

		for _, plan := range plans {
			amount, _ := plan["total_amount"].(float64)
			totalAmount += amount

			if installments, ok := plan["installments"].(bson.A); ok {
				for _, inst := range installments {
					if instMap, ok := inst.(bson.M); ok {
						totalInstallments++
						if paid, ok := instMap["paid"].(bool); ok && paid {
							paidInstallments++
							if amt, ok := instMap["amount"].(float64); ok {
								totalPaid += amt
							}
						} else {
							if amt, ok := instMap["amount"].(float64); ok {
								totalPending += amt
							}
							if fine, ok := instMap["fine"].(float64); ok {
								totalPending += fine
							}
						}
					}
				}
			}
		}

		name, _ := c["name"].(string)
		nameUrdu, _ := c["name_urdu"].(string)
		fatherName, _ := c["father_name"].(string)
		phone, _ := c["phone"].(string)
		cnic, _ := c["cnic"].(string)
		address, _ := c["address"].(string)

		status := "active"
		if totalPending == 0 && totalPlans > 0 {
			status = "completed"
		}

		result = append(result, CustomerReportItem{
			ID:                custID.Hex(),
			Name:              name,
			NameUrdu:          nameUrdu,
			FatherName:        fatherName,
			Phone:             phone,
			CNIC:              cnic,
			Address:           address,
			TotalPlans:        totalPlans,
			TotalAmount:       totalAmount,
			TotalPaid:         totalPaid,
			TotalPending:      totalPending,
			TotalInstallments: totalInstallments,
			PaidInstallments:  paidInstallments,
			Status:            status,
		})
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
		return existingTotal + salesResults[0].Total
	}
	return existingTotal
}
