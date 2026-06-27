package handler

import (
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
	paymentsColl := db.Collection("payments")
	installmentsColl := db.Collection("installments")

	// Get all payments for this date
	paymentsPipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: bson.M{
			"transaction_date": bson.M{"$gte": startOfDay, "$lt": endOfDay},
		}}},
		bson.D{{Key: "$lookup", Value: bson.M{
			"from":         "installments",
			"localField":   "installment_plan_id",
			"foreignField": "_id",
			"as":           "plan",
		}}},
		bson.D{{Key: "$unwind", Value: bson.M{"path": "$plan", "preserveNullAndEmptyArrays": true}}},
		bson.D{{Key: "$lookup", Value: bson.M{
			"from":         "customers",
			"localField":   "plan.customer_id",
			"foreignField": "_id",
			"as":           "customer",
		}}},
		bson.D{{Key: "$unwind", Value: bson.M{"path": "$customer", "preserveNullAndEmptyArrays": true}}},
		bson.D{{Key: "$lookup", Value: bson.M{
			"from":         "products",
			"localField":   "plan.product_id",
			"foreignField": "_id",
			"as":           "product",
		}}},
		bson.D{{Key: "$unwind", Value: bson.M{"path": "$product", "preserveNullAndEmptyArrays": true}}},
		bson.D{{Key: "$project", Value: bson.M{
			"id":                bson.M{"$toString": "$_id"},
			"customer_name":     "$customer.name",
			"customer_urdu":     "$customer.name_urdu",
			"father_name":       "$customer.father_name",
			"phone":             "$customer.phone",
			"product_name":      "$product.name",
			"product_name_urdu": "$product.name_urdu",
			"amount":            "$amount_paid",
			"type":              "$payment_type",
			"status":            "paid",
			"date":              bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$transaction_date"}},
			"installment_no":    "$installment_no",
		}}},
		bson.D{{Key: "$sort", Value: bson.M{"date": -1}}},
	}

	cursor, err := paymentsColl.Aggregate(r.Context(), paymentsPipeline)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch daily report", "ناکام")
		return
	}
	defer cursor.Close(r.Context())

	var transactions []bson.M
	if err = cursor.All(r.Context(), &transactions); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "ناکام")
		return
	}
	if transactions == nil {
		transactions = []bson.M{}
	}

	// Calculate totals
	var totalCollected, totalPending float64
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
	pendingPipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: bson.M{"status": "active"}}},
		bson.D{{Key: "$unwind", Value: "$installments"}},
		bson.D{{Key: "$match", Value: bson.M{
			"installments.paid":     false,
			"installments.due_date": bson.M{"$gte": startOfDay, "$lt": endOfDay},
		}}},
		bson.D{{Key: "$group", Value: bson.M{
			"_id": nil,
			"total_pending": bson.M{"$sum": bson.M{
				"$subtract": bson.A{
					bson.M{"$add": bson.A{"$installments.amount", "$installments.fine"}},
					"$installments.partial_paid",
				},
			}},
			"count": bson.M{"$sum": 1},
		}}},
	}

	pendingCursor, err := installmentsColl.Aggregate(r.Context(), pendingPipeline)
	if err == nil {
		defer pendingCursor.Close(r.Context())
		var pendingResults []struct {
			TotalPending float64 `bson:"total_pending"`
			Count        int     `bson:"count"`
		}
		if pendingCursor.All(r.Context(), &pendingResults) == nil && len(pendingResults) > 0 {
			totalPending = pendingResults[0].TotalPending
		}
	}

	// Get total sales (sum of all installment plan totals created today)
	salesPipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: bson.M{
			"created_at": bson.M{"$gte": startOfDay, "$lt": endOfDay},
		}}},
		bson.D{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$total_amount"},
		}}},
	}

	salesCursor, err := installmentsColl.Aggregate(r.Context(), salesPipeline)
	totalSales := totalCollected
	if err == nil {
		defer salesCursor.Close(r.Context())
		var salesResults []struct {
			Total float64 `bson:"total"`
		}
		if salesCursor.All(r.Context(), &salesResults) == nil && len(salesResults) > 0 {
			totalSales += salesResults[0].Total
		}
	}

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
	paymentsColl := db.Collection("payments")
	installmentsColl := db.Collection("installments")

	// Get all payments in date range
	paymentsPipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: bson.M{
			"transaction_date": bson.M{"$gte": start, "$lt": end},
		}}},
		bson.D{{Key: "$lookup", Value: bson.M{
			"from":         "installments",
			"localField":   "installment_plan_id",
			"foreignField": "_id",
			"as":           "plan",
		}}},
		bson.D{{Key: "$unwind", Value: bson.M{"path": "$plan", "preserveNullAndEmptyArrays": true}}},
		bson.D{{Key: "$lookup", Value: bson.M{
			"from":         "customers",
			"localField":   "plan.customer_id",
			"foreignField": "_id",
			"as":           "customer",
		}}},
		bson.D{{Key: "$unwind", Value: bson.M{"path": "$customer", "preserveNullAndEmptyArrays": true}}},
		bson.D{{Key: "$lookup", Value: bson.M{
			"from":         "products",
			"localField":   "plan.product_id",
			"foreignField": "_id",
			"as":           "product",
		}}},
		bson.D{{Key: "$unwind", Value: bson.M{"path": "$product", "preserveNullAndEmptyArrays": true}}},
		bson.D{{Key: "$project", Value: bson.M{
			"id":                bson.M{"$toString": "$_id"},
			"customer_name":     "$customer.name",
			"customer_urdu":     "$customer.name_urdu",
			"father_name":       "$customer.father_name",
			"phone":             "$customer.phone",
			"product_name":      "$product.name",
			"product_name_urdu": "$product.name_urdu",
			"amount":            "$amount_paid",
			"type":              "$payment_type",
			"status":            "paid",
			"date":              bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$transaction_date"}},
			"installment_no":    "$installment_no",
		}}},
		bson.D{{Key: "$sort", Value: bson.M{"date": -1}}},
	}

	cursor, err := paymentsColl.Aggregate(r.Context(), paymentsPipeline)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch report", "ناکام")
		return
	}
	defer cursor.Close(r.Context())

	var transactions []bson.M
	if err = cursor.All(r.Context(), &transactions); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "ناکام")
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

	// Get pending installments in date range
	pendingPipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: bson.M{"status": "active"}}},
		bson.D{{Key: "$unwind", Value: "$installments"}},
		bson.D{{Key: "$match", Value: bson.M{
			"installments.paid":     false,
			"installments.due_date": bson.M{"$gte": start, "$lt": end},
		}}},
		bson.D{{Key: "$group", Value: bson.M{
			"_id": nil,
			"total_pending": bson.M{"$sum": bson.M{
				"$subtract": bson.A{
					bson.M{"$add": bson.A{"$installments.amount", "$installments.fine"}},
					"$installments.partial_paid",
				},
			}},
			"count": bson.M{"$sum": 1},
		}}},
	}

	pendingCursor, err := installmentsColl.Aggregate(r.Context(), pendingPipeline)
	totalPending := 0.0
	if err == nil {
		defer pendingCursor.Close(r.Context())
		var pendingResults []struct {
			TotalPending float64 `bson:"total_pending"`
			Count        int     `bson:"count"`
		}
		if pendingCursor.All(r.Context(), &pendingResults) == nil && len(pendingResults) > 0 {
			totalPending = pendingResults[0].TotalPending
		}
	}

	// Get total sales in date range
	salesPipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: bson.M{
			"created_at": bson.M{"$gte": start, "$lt": end},
		}}},
		bson.D{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$total_amount"},
		}}},
	}

	salesCursor, err := installmentsColl.Aggregate(r.Context(), salesPipeline)
	totalSales := totalCollected
	if err == nil {
		defer salesCursor.Close(r.Context())
		var salesResults []struct {
			Total float64 `bson:"total"`
		}
		if salesCursor.All(r.Context(), &salesResults) == nil && len(salesResults) > 0 {
			totalSales += salesResults[0].Total
		}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"date":              start.Format("2006-01-02"),
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
	customersColl := db.Collection("customers")
	installmentsColl := db.Collection("installments")

	cursor, err := customersColl.Find(r.Context(), bson.M{}, options.Find().SetSort(bson.M{"name": 1}))
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch customers", "ناکام")
		return
	}
	defer cursor.Close(r.Context())

	var customers []bson.M
	if err = cursor.All(r.Context(), &customers); err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to parse customers", "ناکام")
		return
	}

	type CustomerReportItem struct {
		ID                string  `json:"id"`
		Name              string  `json:"name"`
		NameUrdu          string  `json:"name_urdu"`
		FatherName        string  `json:"father_name"`
		Phone             string  `json:"phone"`
		CNIC              string  `json:"cnic"`
		Address           string  `json:"address"`
		TotalPlans        int     `json:"total_plans"`
		TotalAmount       float64 `json:"total_amount"`
		TotalPaid         float64 `json:"total_paid"`
		TotalPending      float64 `json:"total_pending"`
		TotalInstallments int     `json:"total_installments"`
		PaidInstallments  int     `json:"paid_installments"`
		Status            string  `json:"status"`
	}

	var result []CustomerReportItem
	for _, c := range customers {
		custID, ok := c["_id"].(primitive.ObjectID)
		if !ok {
			continue
		}

		// Get all plans for this customer
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
