package handler

import (
	"net/http"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)


type AccountingHandler struct {
	svc *service.AccountingService
}

func NewAccountingHandler(svc *service.AccountingService) *AccountingHandler {
	return &AccountingHandler{svc: svc}
}

// Helper to calculate profit for a single payment
// Formula: Profit = PaymentAmount * (1 - PurchasePrice / TotalAmount)
// Example: 80,000 purchase, 100,000 sale, 50,000 advance
//   Profit = 50,000 * (1 - 80,000/100,000) = 50,000 * 0.2 = 10,000
func calculatePaymentProfit(pay domain.Payment, db *mongo.Database) float64 {
	var plan domain.InstallmentPlan
	if err := db.Collection("installment_plans").FindOne(nil, bson.M{"_id": pay.InstallmentPlanID}).Decode(&plan); err != nil {
		return 0 // If no plan found, cannot determine profit
	}
	if plan.TotalAmount <= 0 {
		return 0 // Cannot determine profit without total amount
	}
	purchasePrice := 0.0
	if plan.ProductID != "" {
		var prod domain.Product
		// Try both field name formats: purchaseprice (lowercase) and purchasePrice (camelCase)
		if err := db.Collection("products").FindOne(nil, bson.M{"_id": plan.ProductID}).Decode(&prod); err == nil {
			purchasePrice = prod.PurchasePrice
		}
		// If PurchasePrice is still 0, try to fetch it directly from MongoDB
		// to handle field name mismatch (bson tag is "purchaseprice" but data may be stored as "purchasePrice")
		if purchasePrice <= 0 {
			var rawProd bson.M
			if err := db.Collection("products").FindOne(nil, bson.M{"_id": plan.ProductID}).Decode(&rawProd); err == nil {
				// Try camelCase first, then lowercase
				if val, ok := rawProd["purchasePrice"]; ok {
					if v, ok2 := val.(float64); ok2 && v > 0 {
						purchasePrice = v
					}
				}
				if purchasePrice <= 0 {
					if val, ok := rawProd["purchaseprice"]; ok {
						if v, ok2 := val.(float64); ok2 && v > 0 {
							purchasePrice = v
						}
					}
				}
			}
		}
	}
	// If purchase price is 0 or not found, cannot determine profit
	if purchasePrice <= 0 {
		return 0 // Cannot determine profit without purchase price
	}
	if plan.TotalAmount <= purchasePrice {
		return 0 // No profit if selling price <= purchase price
	}
	profitRatio := (plan.TotalAmount - purchasePrice) / plan.TotalAmount
	return pay.Amount * profitRatio
}

// Helper to get payment details with customer info for a date range
func getPaymentDetailsWithProfit(db *mongo.Database, start, end time.Time) ([]map[string]interface{}, float64, float64) {
	var details []map[string]interface{}
	totalRevenue := 0.0
	totalProfit := 0.0

	// Try both field name formats: transactiondate (lowercase) and transactionDate (camelCase)
	cursor, err := db.Collection("payments").Find(nil, bson.M{
		"transactiondate": bson.M{"$gte": start, "$lt": end},
	})
	if err != nil {
		// Retry with camelCase field name
		cursor, err = db.Collection("payments").Find(nil, bson.M{
			"transactionDate": bson.M{"$gte": start, "$lt": end},
		})
	}
	if err != nil {
		return details, totalRevenue, totalProfit
	}
	defer cursor.Close(nil)

	for cursor.Next(nil) {
		var pay domain.Payment
		if cursor.Decode(&pay) != nil {
			continue
		}

		totalRevenue += pay.Amount
		profit := calculatePaymentProfit(pay, db)
		totalProfit += profit

		// Get customer and product info
		custName := ""
		custUrdu := ""
		fatherName := ""
		phone := ""
		prodName := ""

		var plan domain.InstallmentPlan
		if err := db.Collection("installment_plans").FindOne(nil, bson.M{"_id": pay.InstallmentPlanID}).Decode(&plan); err == nil {
			var cust domain.Customer
			if err := db.Collection("customers").FindOne(nil, bson.M{"_id": plan.CustomerID}).Decode(&cust); err == nil {
				custName = cust.Name
				custUrdu = cust.NameUrdu
				fatherName = cust.FatherName
				phone = cust.Phone
			}
			if plan.ProductID != "" {
				var prod domain.Product
				if err := db.Collection("products").FindOne(nil, bson.M{"_id": plan.ProductID}).Decode(&prod); err == nil {
					prodName = prod.Name
				}
			}
		}

		// Determine payment type
		paymentType := "installment"
		if pay.InstallmentNo == 0 {
			paymentType = "down_payment"
		}
		if pay.IsFullPayment {
			paymentType = "full_payment"
		}

		details = append(details, map[string]interface{}{
			"customer_name":      custName,
			"customer_name_urdu": custUrdu,
			"father_name":        fatherName,
			"phone":              phone,
			"product_name":       prodName,
			"amount":             pay.Amount,
			"profit":             profit,
			"date":               pay.TransactionDate.Format("2006-01-02"),
			"method":             pay.Method,
			"installment_no":     pay.InstallmentNo,
			"collected_by":       pay.CollectedBy,
			"payment_type":       paymentType,
		})
	}

	if details == nil {
		details = []map[string]interface{}{}
	}
	return details, totalRevenue, totalProfit
}

func (h *AccountingHandler) TodaySummary(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	end := start.Add(24 * time.Hour)

	db := config.MongoDatabase
	if db == nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"revenue": 0, "profit": 0, "details": []interface{}{},
		})
		return
	}

	details, revenue, profit := getPaymentDetailsWithProfit(db, start, end)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"revenue":  revenue,
		"profit":   profit,
		"details":  details,
		"date":     now.Format("2006-01-02"),
	})
}

func (h *AccountingHandler) MonthSummary(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	end := start.AddDate(0, 1, 0)

	db := config.MongoDatabase
	if db == nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"revenue": 0, "profit": 0, "details": []interface{}{},
		})
		return
	}

	details, revenue, profit := getPaymentDetailsWithProfit(db, start, end)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"revenue":  revenue,
		"profit":   profit,
		"details":  details,
		"month":    now.Format("2006-01"),
	})
}

func (h *AccountingHandler) ProfitLossCashFlow(w http.ResponseWriter, r *http.Request) {
	start, end, err := parseDateRange(r)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid date range", "غلط تاریخ کی حد")
		return
	}
	revenue, profit, err := h.svc.GetRevenueAndProfit(r.Context(), start, end)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to get profit/loss", "منافع/نقصان نہیں آیا")
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"revenue": revenue,
		"profit":  profit,
		"start":   start.Format("2006-01-02"),
		"end":     end.Format("2006-01-02"),
	})
}

func (h *AccountingHandler) ProfitLossAccrual(w http.ResponseWriter, r *http.Request) {
	start, end, err := parseDateRange(r)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid date range", "غلط تاریخ کی حد")
		return
	}
	db := config.DB
	rows, err := db.QueryContext(r.Context(), `
		SELECT type, amount FROM accounting_entries 
		WHERE basis = 'accrual' AND date >= ? AND date <= ?
	`, start, end)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to get accrual report", "اکروئل رپورٹ نہیں آئی")
		return
	}
	defer rows.Close()
	var income, expense float64
	for rows.Next() {
		var typ string
		var amt float64
		rows.Scan(&typ, &amt)
		if typ == "income" {
			income += amt
		} else {
			expense += amt
		}
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"income":  income,
		"expense": expense,
		"profit":  income - expense,
	})
}