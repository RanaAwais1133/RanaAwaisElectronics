package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
)

type ReportHandler struct{}

func NewReportHandler() *ReportHandler {
	return &ReportHandler{}
}

// ═══════════════════════════════════════════════════════════════
// DAILY REPORT
// ═══════════════════════════════════════════════════════════════

func (h *ReportHandler) DailyReport(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"error": "Database not connected",
		})
		return
	}

	dateStr := r.URL.Query().Get("date")
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid date format", "غلط تاریخ")
		return
	}

	todayStart := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	todayEnd := todayStart.Add(24 * time.Hour)

	// Get payments for this date
	payCursor, err := db.Collection("payments").Find(r.Context(), bson.M{
		"transactiondate": bson.M{"$gte": todayStart, "$lt": todayEnd},
	})
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch payments", "ادائیگیاں نہیں ملیں")
		return
	}
	defer payCursor.Close(r.Context())

	var cashTotal, bankTotal float64
	var transactions []map[string]interface{}
	for payCursor.Next(r.Context()) {
		var pay domain.Payment
		if payCursor.Decode(&pay) != nil {
			continue
		}

		// Get plan info
		var plan domain.InstallmentPlan
		custName := ""
		custUrdu := ""
		fatherName := ""
		phone := ""
		cnic := ""
		addr := ""
		addrUrdu := ""
		prodName := ""
		prodNameUrdu := ""

		if err := db.Collection("installment_plans").FindOne(r.Context(), bson.M{"_id": pay.InstallmentPlanID}).Decode(&plan); err == nil {
			// Get customer info
			var cust domain.Customer
			if err := db.Collection("customers").FindOne(r.Context(), bson.M{"_id": plan.CustomerID}).Decode(&cust); err == nil {
				custName = cust.Name
				custUrdu = cust.NameUrdu
				fatherName = cust.FatherName
				phone = cust.Phone
				cnic = cust.CNIC
				addr = cust.Address
				addrUrdu = cust.AddressUrdu
			}
			// Get product info
			if plan.ProductID != "" {
				var prod domain.Product
				if err := db.Collection("products").FindOne(r.Context(), bson.M{"_id": plan.ProductID}).Decode(&prod); err == nil {
					prodName = prod.Name
					prodNameUrdu = prod.NameUrdu
				}
			}
		}

		paymentType := "Installment"
		if pay.InstallmentNo == 0 {
			paymentType = "Down Payment"
		}
		if pay.IsFullPayment {
			paymentType = "Full Payment"
		}
		item := map[string]interface{}{
			"id":                 pay.ID,
			"customer_name":      custName,
			"customer_urdu":      custUrdu,
			"father_name":        fatherName,
			"phone":              phone,
			"cnic":               cnic,
			"address":            addr,
			"address_urdu":       addrUrdu,
			"product_name":       prodName,
			"product_name_urdu":  prodNameUrdu,
			"amount":             pay.Amount,
			"method":             pay.Method,
			"type":               paymentType,
			"status":             "paid",
			"date":               pay.TransactionDate.Format("2006-01-02"),
			"installment_no":     pay.InstallmentNo,
			"collected_by":       pay.CollectedBy,
			"plan_id":            pay.InstallmentPlanID,
		}
		transactions = append(transactions, item)

		if pay.Method == "bank" {
			bankTotal += pay.Amount
		} else {
			cashTotal += pay.Amount
		}
	}
	if transactions == nil {
		transactions = []map[string]interface{}{}
	}

	// Total customers
	totalCustomers := int64(0)
	if count, err := db.Collection("customers").CountDocuments(r.Context(), bson.M{}); err == nil {
		totalCustomers = count
	}

	// Pending amount for today
	pendingAmount := 0.0
	planCursor, err := db.Collection("installment_plans").Find(r.Context(), bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err == nil {
		for planCursor.Next(r.Context()) {
			var plan domain.InstallmentPlan
			if planCursor.Decode(&plan) != nil {
				continue
			}
			for _, d := range plan.Installments {
				if d.Paid {
					continue
				}
				if d.DueDate.After(todayStart.Add(-time.Second)) && d.DueDate.Before(todayEnd) {
					pendingAmount += d.Amount + d.Fine - d.PartialPaid
				}
			}
		}
		planCursor.Close(r.Context())
	}

	// Total collected today
	totalCollected := cashTotal + bankTotal

	// Total installments due today
	totalInstallments := 0
	planCursor2, err := db.Collection("installment_plans").Find(r.Context(), bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err == nil {
		for planCursor2.Next(r.Context()) {
			var plan domain.InstallmentPlan
			if planCursor2.Decode(&plan) != nil {
				continue
			}
			for _, d := range plan.Installments {
				if d.Paid {
					continue
				}
				if d.DueDate.After(todayStart.Add(-time.Second)) && d.DueDate.Before(todayEnd) {
					totalInstallments++
				}
			}
		}
		planCursor2.Close(r.Context())
	}

	// Recovery rate
	recoveryRate := 0.0
	totalRemaining := 0.0
	planCursor3, err := db.Collection("installment_plans").Find(r.Context(), bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err == nil {
		for planCursor3.Next(r.Context()) {
			var plan domain.InstallmentPlan
			if planCursor3.Decode(&plan) != nil {
				continue
			}
			for _, d := range plan.Installments {
				if d.Paid {
					continue
				}
				totalRemaining += d.Amount + d.Fine - d.PartialPaid
			}
		}
		planCursor3.Close(r.Context())
	}
	if totalRemaining+totalCollected > 0 {
		recoveryRate = (totalCollected / (totalCollected + totalRemaining)) * 100
	}

	// Open/closed accounts
	openAccounts := int64(0)
	closedAccounts := int64(0)
	if count, err := db.Collection("installment_plans").CountDocuments(r.Context(), bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	}); err == nil {
		openAccounts = count
	}
	if count, err := db.Collection("installment_plans").CountDocuments(r.Context(), bson.M{
		"status": bson.M{"$in": []string{"completed", "Completed", "Closed", "paid"}},
	}); err == nil {
		closedAccounts = count
	}

	// Total outstanding
	totalOutstanding := 0.0
	planCursor4, err := db.Collection("installment_plans").Find(r.Context(), bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err == nil {
		for planCursor4.Next(r.Context()) {
			var plan domain.InstallmentPlan
			if planCursor4.Decode(&plan) != nil {
				continue
			}
			for _, d := range plan.Installments {
				if d.Paid {
					continue
				}
				totalOutstanding += d.Amount + d.Fine - d.PartialPaid
			}
		}
		planCursor4.Close(r.Context())
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"date":                dateStr,
		"total_sales":         cashTotal + bankTotal,
		"total_pending":       pendingAmount,
		"total_collected":     totalCollected,
		"total_installments":  totalInstallments,
		"customers":           totalCustomers,
		"cash_in_hand":        cashTotal,
		"bank_deposit":        bankTotal,
		"transactions":        transactions,
		"recoveryRate":        recoveryRate,
		"open_accounts":       openAccounts,
		"closed_accounts":     closedAccounts,
		"net_accounts":        openAccounts + closedAccounts,
		"total_outstanding":   totalOutstanding,
		"cash_in_hand_amount": cashTotal,
		"bank_deposit_amount": bankTotal,
	})
}

// ═══════════════════════════════════════════════════════════════
// WEEKLY REPORT
// ═══════════════════════════════════════════════════════════════

func (h *ReportHandler) WeeklyReport(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	today := now.Truncate(24 * time.Hour)
	weekday := now.Weekday()
	daysSinceMonday := int(weekday) - 1
	if daysSinceMonday < 0 {
		daysSinceMonday = 6
	}
	monday := today.AddDate(0, 0, -daysSinceMonday)
	sunday := monday.AddDate(0, 0, 7)
	h.getRangeReport(w, r, monday, sunday, "weekly")
}

// ═══════════════════════════════════════════════════════════════
// MONTHLY REPORT
// ═══════════════════════════════════════════════════════════════

func (h *ReportHandler) MonthlyReport(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	monthEnd := monthStart.AddDate(0, 1, 0)
	h.getRangeReport(w, r, monthStart, monthEnd, "monthly")
}

// ═══════════════════════════════════════════════════════════════
// DATE RANGE REPORT
// ═══════════════════════════════════════════════════════════════

func (h *ReportHandler) DateRangeReport(w http.ResponseWriter, r *http.Request) {
	start, end, err := parseDateRange(r)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid date range", "غلط تاریخ کی حد")
		return
	}
	h.getRangeReport(w, r, start, end, "date-range")
}

// ═══════════════════════════════════════════════════════════════
// RANGE REPORT (shared by weekly, monthly, date-range)
// ═══════════════════════════════════════════════════════════════

func (h *ReportHandler) getRangeReport(w http.ResponseWriter, r *http.Request, start, end time.Time, reportType string) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"error": "Database not connected",
		})
		return
	}

	// Get payments in range
	payCursor, err := db.Collection("payments").Find(r.Context(), bson.M{
		"transactiondate": bson.M{"$gte": start, "$lt": end},
	})
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch payments", "ادائیگیاں نہیں ملیں")
		return
	}
	defer payCursor.Close(r.Context())

	var cashTotal, bankTotal float64
	var transactions []map[string]interface{}
	for payCursor.Next(r.Context()) {
		var pay domain.Payment
		if payCursor.Decode(&pay) != nil {
			continue
		}

		var plan domain.InstallmentPlan
		custName := ""
		custUrdu := ""
		fatherName := ""
		phone := ""
		cnic := ""
		addr := ""
		addrUrdu := ""
		prodName := ""
		prodNameUrdu := ""
		finePaid := 0.0

		if err := db.Collection("installment_plans").FindOne(r.Context(), bson.M{"_id": pay.InstallmentPlanID}).Decode(&plan); err == nil {
			var cust domain.Customer
			if err := db.Collection("customers").FindOne(r.Context(), bson.M{"_id": plan.CustomerID}).Decode(&cust); err == nil {
				custName = cust.Name
				custUrdu = cust.NameUrdu
				fatherName = cust.FatherName
				phone = cust.Phone
				cnic = cust.CNIC
				addr = cust.Address
				addrUrdu = cust.AddressUrdu
			}
			if plan.ProductID != "" {
				var prod domain.Product
				if err := db.Collection("products").FindOne(r.Context(), bson.M{"_id": plan.ProductID}).Decode(&prod); err == nil {
					prodName = prod.Name
					prodNameUrdu = prod.NameUrdu
				}
			}
		}

		item := map[string]interface{}{
			"id":                pay.ID,
			"customer_name":     custName,
			"customer_urdu":     custUrdu,
			"father_name":       fatherName,
			"phone":             phone,
			"cnic":              cnic,
			"address":           addr,
			"address_urdu":      addrUrdu,
			"product_name":      prodName,
			"product_name_urdu": prodNameUrdu,
			"amount":            pay.Amount,
			"fine_paid":         finePaid,
			"method":            pay.Method,
			"status":            "paid",
			"date":              pay.TransactionDate.Format("2006-01-02"),
			"installment_no":    pay.InstallmentNo,
			"collected_by":      pay.CollectedBy,
			"plan_id":           pay.InstallmentPlanID,
		}
		transactions = append(transactions, item)

		if pay.Method == "bank" {
			bankTotal += pay.Amount
		} else {
			cashTotal += pay.Amount
		}
	}
	if transactions == nil {
		transactions = []map[string]interface{}{}
	}

	// Total customers
	totalCustomers := int64(0)
	if count, err := db.Collection("customers").CountDocuments(r.Context(), bson.M{}); err == nil {
		totalCustomers = count
	}

	// Total pending
	totalPending := 0.0
	planCursor, err := db.Collection("installment_plans").Find(r.Context(), bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err == nil {
		for planCursor.Next(r.Context()) {
			var plan domain.InstallmentPlan
			if planCursor.Decode(&plan) != nil {
				continue
			}
			for _, d := range plan.Installments {
				if d.Paid {
					continue
				}
				totalPending += d.Amount + d.Fine - d.PartialPaid
			}
		}
		planCursor.Close(r.Context())
	}

	// Open/closed accounts
	openAccounts := int64(0)
	closedAccounts := int64(0)
	if count, err := db.Collection("installment_plans").CountDocuments(r.Context(), bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	}); err == nil {
		openAccounts = count
	}
	if count, err := db.Collection("installment_plans").CountDocuments(r.Context(), bson.M{
		"status": bson.M{"$in": []string{"completed", "Completed", "Closed", "paid"}},
	}); err == nil {
		closedAccounts = count
	}

	// Total outstanding
	totalOutstanding := 0.0
	planCursor2, err := db.Collection("installment_plans").Find(r.Context(), bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err == nil {
		for planCursor2.Next(r.Context()) {
			var plan domain.InstallmentPlan
			if planCursor2.Decode(&plan) != nil {
				continue
			}
			for _, d := range plan.Installments {
				if d.Paid {
					continue
				}
				totalOutstanding += d.Amount + d.Fine - d.PartialPaid
			}
		}
		planCursor2.Close(r.Context())
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"start":             start.Format("2006-01-02"),
		"end":               end.Format("2006-01-02"),
		"report_type":       reportType,
		"total_sales":       cashTotal + bankTotal,
		"pending":           totalPending,
		"customers":         totalCustomers,
		"cash_in_hand":      cashTotal,
		"bank_deposit":      bankTotal,
		"transactions":      transactions,
		"open_accounts":     openAccounts,
		"closed_accounts":   closedAccounts,
		"net_accounts":      openAccounts + closedAccounts,
		"total_outstanding": totalOutstanding,
	})
}

// ═══════════════════════════════════════════════════════════════
// CUSTOMER REPORT
// ═══════════════════════════════════════════════════════════════

func (h *ReportHandler) CustomerReport(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"customers": []interface{}{},
			"total":     0,
		})
		return
	}

	cursor, err := db.Collection("customers").Find(r.Context(), bson.M{})
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch customers", "گاہک نہیں ملے")
		return
	}
	defer cursor.Close(r.Context())

	var customers []map[string]interface{}
	for cursor.Next(r.Context()) {
		var cust domain.Customer
		if cursor.Decode(&cust) != nil {
			continue
		}

		// Get plans for this customer
		planCursor, err := db.Collection("installment_plans").Find(r.Context(), bson.M{
			"customerid": cust.ID,
		})
		totalPlans := 0
		activePlans := 0
		completedPlans := 0
		totalPurchase := 0.0
		totalOutstanding := 0.0

		if err == nil {
			for planCursor.Next(r.Context()) {
				var plan domain.InstallmentPlan
				if planCursor.Decode(&plan) != nil {
					continue
				}
				totalPlans++
				totalPurchase += plan.TotalAmount

				status := strings.ToLower(plan.Status)
				if status == "active" || status == "open" {
					activePlans++
					// Calculate remaining
					totalPaid := 0.0
					payC, _ := db.Collection("payments").Find(r.Context(), bson.M{"installmentplanid": plan.ID})
					if payC != nil {
						for payC.Next(r.Context()) {
							var pay domain.Payment
							if payC.Decode(&pay) == nil {
								totalPaid += pay.Amount
							}
						}
						payC.Close(r.Context())
					}
					// NOTE: Payments collection already includes down payment
					remaining := plan.TotalAmount - totalPaid
					if remaining > 0 {
						totalOutstanding += remaining
					}
				} else if status == "completed" || status == "closed" || status == "paid" {
					completedPlans++
				}
			}
			planCursor.Close(r.Context())
		}

		customers = append(customers, map[string]interface{}{
			"id":                cust.ID,
			"name":              cust.Name,
			"name_urdu":         cust.NameUrdu,
			"phone":             cust.Phone,
			"cnic":              cust.CNIC,
			"address":           cust.Address,
			"address_urdu":      cust.AddressUrdu,
			"total_plans":       totalPlans,
			"active_plans":      activePlans,
			"completed_plans":   completedPlans,
			"total_purchase":    totalPurchase,
			"total_outstanding": totalOutstanding,
			"created_at":        cust.CreatedAt.Format("2006-01-02"),
		})
	}
	if customers == nil {
		customers = []map[string]interface{}{}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"customers": customers,
		"total":     len(customers),
	})
}

