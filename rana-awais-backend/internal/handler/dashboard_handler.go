package handler

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/audit"
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

func getCustomer(db *mongo.Database, id string) *domain.Customer {
	var cust domain.Customer
	err := db.Collection("customers").FindOne(nil, bson.M{"_id": id}).Decode(&cust)
	if err != nil {
		return nil
	}
	return &cust
}

func getProduct(db *mongo.Database, id string) *domain.Product {
	var prod domain.Product
	err := db.Collection("products").FindOne(nil, bson.M{"_id": id}).Decode(&prod)
	if err != nil {
		return nil
	}
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

	// TODAY'S COLLECTION
	todayCollectionTotal := 0.0
	todayCollectionCount := 0
	payCursor, err := db.Collection("payments").Find(nil, bson.M{
		"transactiondate": bson.M{"$gte": todayStart, "$lt": todayEnd},
	})
	if err == nil {
		for payCursor.Next(nil) {
			var pay domain.Payment
			if payCursor.Decode(&pay) == nil {
				todayCollectionTotal += pay.Amount
				todayCollectionCount++
			}
		}
		payCursor.Close(nil)
	}

	// TODAY'S PROFIT
	todayProfit := 0.0
	payCursor2, err := db.Collection("payments").Find(nil, bson.M{
		"transactiondate": bson.M{"$gte": todayStart, "$lt": todayEnd},
	})
	if err == nil {
		for payCursor2.Next(nil) {
			var pay domain.Payment
			if payCursor2.Decode(&pay) == nil {
				var plan domain.InstallmentPlan
				if err := db.Collection("installment_plans").FindOne(nil, bson.M{"_id": pay.InstallmentPlanID}).Decode(&plan); err == nil {
					if plan.TotalAmount > 0 {
						purchasePrice := 0.0
						if plan.ProductID != "" {
							prod := getProduct(db, plan.ProductID)
							if prod != nil {
								purchasePrice = prod.PurchasePrice
							}
						}
						// Calculate profit ratio: if purchasePrice is 0, profit = full amount
						// Otherwise profit = (sellingPrice - purchasePrice) / sellingPrice * paymentAmount
						if purchasePrice > 0 && plan.TotalAmount > purchasePrice {
							profitRatio := (plan.TotalAmount - purchasePrice) / plan.TotalAmount
							todayProfit += pay.Amount * profitRatio
						} else if purchasePrice <= 0 {
							// No purchase price means full amount is profit
							todayProfit += pay.Amount
						}
					}
				}
			}
		}
		payCursor2.Close(nil)
	}

	todayRevenue := todayCollectionTotal

	// MONTHLY COLLECTION
	monthCollectionTotal := 0.0
	monthCollectionCount := 0
	payCursor3, err := db.Collection("payments").Find(nil, bson.M{
		"transactiondate": bson.M{"$gte": monthStart, "$lt": monthEnd},
	})
	if err == nil {
		for payCursor3.Next(nil) {
			var pay domain.Payment
			if payCursor3.Decode(&pay) == nil {
				monthCollectionTotal += pay.Amount
				monthCollectionCount++
			}
		}
		payCursor3.Close(nil)
	}

	// MONTHLY PROFIT
	monthProfit := 0.0
	payCursor4, err := db.Collection("payments").Find(nil, bson.M{
		"transactiondate": bson.M{"$gte": monthStart, "$lt": monthEnd},
	})
	if err == nil {
		for payCursor4.Next(nil) {
			var pay domain.Payment
			if payCursor4.Decode(&pay) == nil {
				var plan domain.InstallmentPlan
				if err := db.Collection("installment_plans").FindOne(nil, bson.M{"_id": pay.InstallmentPlanID}).Decode(&plan); err == nil {
					if plan.TotalAmount > 0 {
						purchasePrice := 0.0
						if plan.ProductID != "" {
							prod := getProduct(db, plan.ProductID)
							if prod != nil {
								purchasePrice = prod.PurchasePrice
							}
						}
						if purchasePrice > 0 && plan.TotalAmount > purchasePrice {
							profitRatio := (plan.TotalAmount - purchasePrice) / plan.TotalAmount
							monthProfit += pay.Amount * profitRatio
						} else if purchasePrice <= 0 {
							// No purchase price means full amount is profit
							monthProfit += pay.Amount
						}
					}
				}
			}
		}
		payCursor4.Close(nil)
	}

	monthRevenue := monthCollectionTotal

	// TOTAL PENDING
	totalPending := 0.0
	pendingCustomers := 0
	pendingTotal := 0.0

	planCursor, err := db.Collection("installment_plans").Find(nil, bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err == nil {
		customerSet := make(map[string]bool)
		for planCursor.Next(nil) {
			var plan domain.InstallmentPlan
			if planCursor.Decode(&plan) != nil {
				continue
			}
			planRemaining := 0.0
			for _, d := range plan.Installments {
				if !d.Paid {
					due := d.Amount + d.Fine - d.PartialPaid
					if due > 0 {
						planRemaining += due
					}
				}
			}
			if planRemaining > 0 {
				totalPending += planRemaining
				pendingTotal += planRemaining
				customerSet[plan.CustomerID] = true
			}
		}
		pendingCustomers = len(customerSet)
		planCursor.Close(nil)
	}

	// TOTAL PAID
	totalPaid := 0.0
	payCursor5, err := db.Collection("payments").Find(nil, bson.M{})
	if err == nil {
		for payCursor5.Next(nil) {
			var pay domain.Payment
			if payCursor5.Decode(&pay) == nil {
				totalPaid += pay.Amount
			}
		}
		payCursor5.Close(nil)
	}

	// TOTAL CUSTOMERS
	totalCustomers := int64(0)
	if count, err := db.Collection("customers").CountDocuments(nil, bson.M{}); err == nil {
		totalCustomers = count
	}

	// ACTIVE INSTALLMENTS
	activeInstallments := int64(0)
	if count, err := db.Collection("installment_plans").CountDocuments(nil, bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	}); err == nil {
		activeInstallments = count
	}

	// COMPLETED INSTALLMENTS
	completedInstallments := int64(0)
	if count, err := db.Collection("installment_plans").CountDocuments(nil, bson.M{
		"status": bson.M{"$in": []string{"completed", "Completed", "Closed", "paid"}},
	}); err == nil {
		completedInstallments = count
	}

	// OVERDUE COUNT
	overdueCount := 0
	planCursor2, err := db.Collection("installment_plans").Find(nil, bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err == nil {
		for planCursor2.Next(nil) {
			var plan domain.InstallmentPlan
			if planCursor2.Decode(&plan) != nil {
				continue
			}
			for _, d := range plan.Installments {
				if !d.Paid && d.DueDate.Before(todayStart) {
					overdueCount++
				}
			}
		}
		planCursor2.Close(nil)
	}

	// TODAY DUE COUNT
	todayDueCount := 0
	planCursor3, err := db.Collection("installment_plans").Find(nil, bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err == nil {
		for planCursor3.Next(nil) {
			var plan domain.InstallmentPlan
			if planCursor3.Decode(&plan) != nil {
				continue
			}
			for _, d := range plan.Installments {
				if !d.Paid && d.DueDate.After(todayStart.Add(-time.Second)) && d.DueDate.Before(todayEnd) {
					todayDueCount++
				}
			}
		}
		planCursor3.Close(nil)
	}

	// MONTHLY DUE COUNT
	monthlyDueCount := 0
	planCursor4, err := db.Collection("installment_plans").Find(nil, bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err == nil {
		for planCursor4.Next(nil) {
			var plan domain.InstallmentPlan
			if planCursor4.Decode(&plan) != nil {
				continue
			}
			for _, d := range plan.Installments {
				if !d.Paid && d.DueDate.After(monthStart.Add(-time.Second)) && d.DueDate.Before(monthEnd) {
					monthlyDueCount++
				}
			}
		}
		planCursor4.Close(nil)
	}

	// TOTAL PRODUCTS
	totalProducts := int64(0)
	if count, err := db.Collection("products").CountDocuments(nil, bson.M{}); err == nil {
		totalProducts = count
	}

	// LOW STOCK
	lowStock := int64(0)
	prodCursor, err := db.Collection("products").Find(nil, bson.M{})
	if err == nil {
		for prodCursor.Next(nil) {
			var prod domain.Product
			if prodCursor.Decode(&prod) == nil {
				if prod.StockCount <= 5 {
					lowStock++
				}
			}
		}
		prodCursor.Close(nil)
	}

	// INVENTORY VALUE
	inventoryValue := 0.0
	prodCursor2, err := db.Collection("products").Find(nil, bson.M{})
	if err == nil {
		for prodCursor2.Next(nil) {
			var prod domain.Product
			if prodCursor2.Decode(&prod) == nil {
				inventoryValue += float64(prod.StockCount) * prod.PurchasePrice
			}
		}
		prodCursor2.Close(nil)
	}

	// AGEING INVENTORY
	ageingInventory := int64(0)
	invCursor, err := db.Collection("inventory_items").Find(nil, bson.M{})
	if err == nil {
		for invCursor.Next(nil) {
			var item domain.InventoryItem
			if invCursor.Decode(&item) == nil {
				if item.CreatedAt.Before(time.Now().AddDate(0, 0, -90)) {
					ageingInventory++
				}
			}
		}
		invCursor.Close(nil)
	}

	// CUSTOMERS WITH FINANCE
	customersWithFinance := int64(0)
	planCursor5, err := db.Collection("installment_plans").Find(nil, bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err == nil {
		custSet := make(map[string]bool)
		for planCursor5.Next(nil) {
			var plan domain.InstallmentPlan
			if planCursor5.Decode(&plan) == nil {
				custSet[plan.CustomerID] = true
			}
		}
		customersWithFinance = int64(len(custSet))
		planCursor5.Close(nil)
	}

	// ACTIVE PLANS REMAINING (total - downpayment - paid)
	activePlansRemaining := 0.0
	planCursor6, err := db.Collection("installment_plans").Find(nil, bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err == nil {
		for planCursor6.Next(nil) {
			var plan domain.InstallmentPlan
			if planCursor6.Decode(&plan) != nil {
				continue
			}
			totalPaidOnPlan := 0.0
			payC, err := db.Collection("payments").Find(nil, bson.M{"installmentplanid": plan.ID})
			if err == nil {
				for payC.Next(nil) {
					var pay domain.Payment
					if payC.Decode(&pay) == nil {
						totalPaidOnPlan += pay.Amount
					}
				}
				payC.Close(nil)
			}
			remaining := plan.TotalAmount - plan.DownPayment - totalPaidOnPlan
			if remaining > 0 {
				activePlansRemaining += remaining
			}
		}
		planCursor6.Close(nil)
	}

	audit.Log(r.Context(), "view_dashboard", "dashboard", "", "Dashboard summary viewed")

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"todayCollection": map[string]interface{}{
			"total": todayCollectionTotal,
			"count": todayCollectionCount,
		},
		"todayRevenue": todayRevenue,
		"todayProfit":  todayProfit,
		"monthRevenue": monthRevenue,
		"monthProfit":  monthProfit,
		"totalPending":       totalPending,
		"pendingCustomers":   pendingCustomers,
		"pendingTotal":       pendingTotal,
		"totalPaid":          totalPaid,
		"totalCustomers":     totalCustomers,
		"activeInstallments": activeInstallments,
		"completedInstallments": completedInstallments,
		"overdueCount":    overdueCount,
		"todayDueCount":   todayDueCount,
		"monthlyDueCount": monthlyDueCount,
		"totalProducts":   totalProducts,
		"lowStock":        lowStock,
		"inventoryValue":  inventoryValue,
		"ageingInventory": ageingInventory,
		"customersWithFinance": customersWithFinance,
		"activePlansRemaining": activePlansRemaining,
	})
}

// ═══════════════════════════════════════════════════════════════
// TODAY'S INSTALLMENTS
// ═══════════════════════════════════════════════════════════════

func (h *DashboardHandler) TodayInstallments(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	todayStart, todayEnd := todayRange()

	cursor, err := db.Collection("installment_plans").Find(nil, bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err != nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer cursor.Close(nil)

	var result []map[string]interface{}
	for cursor.Next(nil) {
		var plan domain.InstallmentPlan
		if cursor.Decode(&plan) != nil {
			continue
		}

		cust := getCustomer(db, plan.CustomerID)
		if cust == nil {
			continue
		}

		var prodName string
		if plan.ProductID != "" {
			prod := getProduct(db, plan.ProductID)
			if prod != nil {
				prodName = prod.Name
			}
		}

		for _, d := range plan.Installments {
			if d.Paid {
				continue
			}
			if d.DueDate.Before(todayStart) || d.DueDate.After(todayEnd) {
				continue
			}

			totalPaidOnPlan := 0.0
			payC, _ := db.Collection("payments").Find(nil, bson.M{"installmentplanid": plan.ID})
			if payC != nil {
				for payC.Next(nil) {
					var pay domain.Payment
					if payC.Decode(&pay) == nil {
						totalPaidOnPlan += pay.Amount
					}
				}
				payC.Close(nil)
			}
			planRemaining := plan.TotalAmount - plan.DownPayment - totalPaidOnPlan
			if planRemaining < 0 {
				planRemaining = 0
			}

			// Count paid installments
			paidCount := 0
			for _, inst := range plan.Installments {
				if inst.Paid {
					paidCount++
				}
			}

			item := map[string]interface{}{
				"plan_id":            plan.ID,
				"customer_id":        cust.ID,
				"customer_name":      cust.Name,
				"customer_urdu":      cust.NameUrdu,
				"father_name":        cust.FatherName,
				"phone":              cust.Phone,
				"cnic":               cust.CNIC,
				"address":            cust.Address,
				"address_urdu":       cust.AddressUrdu,
				"product_name":       prodName,
				"installment_no":     d.InstallmentNo,
				"due_date":           d.DueDate.Format("2006-01-02"),
				"amount":             d.Amount,
				"fine":               d.Fine,
				"total_installments": plan.NumberOfInstallments,
				"paid_count":         paidCount,
				"remaining":          planRemaining,
				"total_amount":       plan.TotalAmount,
				"down_payment":       plan.DownPayment,
				"created_at":         plan.CreatedAt.Format("2006-01-02"),
			}
			result = append(result, item)
		}
	}

	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
}

// ═══════════════════════════════════════════════════════════════
// TODAY'S INSTALLMENT STATS
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

	cursor, err := db.Collection("installment_plans").Find(nil, bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err != nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"total_due_count": 0, "collected_count": 0, "remaining_count": 0,
			"total_due_amount": 0, "collected_amount": 0, "remaining_amount": 0,
			"collected_customers": []interface{}{}, "remaining_customers": []interface{}{},
		})
		return
	}
	defer cursor.Close(nil)

	totalDueCount := 0
	totalDueAmount := 0.0
	collectedCount := 0
	collectedAmount := 0.0
	remainingCount := 0
	remainingAmount := 0.0

	var collectedCustomers []map[string]interface{}
	var remainingCustomers []map[string]interface{}
	collectedToday := make(map[string]bool)

	// First check payments made today
	payCursor, err := db.Collection("payments").Find(nil, bson.M{
		"transactiondate": bson.M{"$gte": todayStart, "$lt": todayEnd},
	})
	if err == nil {
		for payCursor.Next(nil) {
			var pay domain.Payment
			if payCursor.Decode(&pay) == nil {
				var plan domain.InstallmentPlan
				if err := db.Collection("installment_plans").FindOne(nil, bson.M{"_id": pay.InstallmentPlanID}).Decode(&plan); err != nil {
					continue
				}
				cust := getCustomer(db, plan.CustomerID)
				if cust == nil {
					continue
				}
				collectedToday[plan.CustomerID] = true
				collectedCount++
				collectedAmount += pay.Amount
				collectedCustomers = append(collectedCustomers, map[string]interface{}{
					"customer_id":        cust.ID,
					"customer_name":      cust.Name,
					"customer_name_urdu": cust.NameUrdu,
					"father_name":        cust.FatherName,
					"phone":              cust.Phone,
					"amount":             pay.Amount,
					"date":               pay.TransactionDate.Format("2006-01-02"),
					"plan_id":            plan.ID,
				})
			}
		}
		payCursor.Close(nil)
	}

	// Now check plans for today's due installments
	for cursor.Next(nil) {
		var plan domain.InstallmentPlan
		if cursor.Decode(&plan) != nil {
			continue
		}
		cust := getCustomer(db, plan.CustomerID)
		if cust == nil {
			continue
		}
		for _, d := range plan.Installments {
			if d.Paid {
				continue
			}
			if d.DueDate.Before(todayStart) || d.DueDate.After(todayEnd) {
				continue
			}
			totalDueCount++
			totalDueAmount += d.Amount
			if !collectedToday[plan.CustomerID] {
				remainingCount++
				remainingAmount += d.Amount
				remainingCustomers = append(remainingCustomers, map[string]interface{}{
					"customer_id":        cust.ID,
					"customer_name":      cust.Name,
					"customer_name_urdu": cust.NameUrdu,
					"father_name":        cust.FatherName,
					"phone":              cust.Phone,
					"amount":             d.Amount,
					"due_date":           d.DueDate.Format("2006-01-02"),
					"plan_id":            plan.ID,
				})
			}
		}
	}

	if collectedCustomers == nil {
		collectedCustomers = []map[string]interface{}{}
	}
	if remainingCustomers == nil {
		remainingCustomers = []map[string]interface{}{}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"total_due_count":     totalDueCount,
		"collected_count":     collectedCount,
		"remaining_count":     remainingCount,
		"total_due_amount":    totalDueAmount,
		"collected_amount":    collectedAmount,
		"remaining_amount":    remainingAmount,
		"collected_customers": collectedCustomers,
		"remaining_customers": remainingCustomers,
	})
}

// ═══════════════════════════════════════════════════════════════
// MONTHLY REPORT with Daybook
// ═══════════════════════════════════════════════════════════════

func (h *DashboardHandler) MonthlyReport(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"total_collection": 0, "total_customers": 0, "new_customers": 0,
			"total_profit": 0, "daily_breakdown": []interface{}{},
			"daybook_details": []interface{}{},
		})
		return
	}

	monthStr := r.URL.Query().Get("month")
	var year, month int
	if monthStr != "" {
		parts := strings.Split(monthStr, "-")
		if len(parts) >= 2 {
			year, _ = strconv.Atoi(parts[0])
			m, _ := strconv.Atoi(parts[1])
			month = m
		}
	}
	if year == 0 || month == 0 {
		now := time.Now()
		year = now.Year()
		month = int(now.Month())
	}

	monthStart := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Now().Location())
	monthEnd := monthStart.AddDate(0, 1, 0)

	// Total Collection
	totalCollection := 0.0
	payCursor, err := db.Collection("payments").Find(nil, bson.M{
		"transactiondate": bson.M{"$gte": monthStart, "$lt": monthEnd},
	})
	if err == nil {
		for payCursor.Next(nil) {
			var pay domain.Payment
			if payCursor.Decode(&pay) == nil {
				totalCollection += pay.Amount
			}
		}
		payCursor.Close(nil)
	}

	// Total Customers (with active plans)
	custSet := make(map[string]bool)
	planCursor, err := db.Collection("installment_plans").Find(nil, bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err == nil {
		for planCursor.Next(nil) {
			var plan domain.InstallmentPlan
			if planCursor.Decode(&plan) == nil {
				custSet[plan.CustomerID] = true
			}
		}
		planCursor.Close(nil)
	}
	totalCustomers := int64(len(custSet))

	// New Customers this month
	newCustomers := int64(0)
	if count, err := db.Collection("customers").CountDocuments(nil, bson.M{
		"createdat": bson.M{"$gte": monthStart, "$lt": monthEnd},
	}); err == nil {
		newCustomers = count
	}

	// Total Profit
	totalProfit := 0.0
	payCursor2, err := db.Collection("payments").Find(nil, bson.M{
		"transactiondate": bson.M{"$gte": monthStart, "$lt": monthEnd},
	})
	if err == nil {
		for payCursor2.Next(nil) {
			var pay domain.Payment
			if payCursor2.Decode(&pay) == nil {
				var plan domain.InstallmentPlan
				if err := db.Collection("installment_plans").FindOne(nil, bson.M{"_id": pay.InstallmentPlanID}).Decode(&plan); err == nil {
					if plan.TotalAmount > 0 {
						purchasePrice := 0.0
						if plan.ProductID != "" {
							prod := getProduct(db, plan.ProductID)
							if prod != nil {
								purchasePrice = prod.PurchasePrice
							}
						}
						if purchasePrice > 0 && plan.TotalAmount > purchasePrice {
							profitRatio := (plan.TotalAmount - purchasePrice) / plan.TotalAmount
							totalProfit += pay.Amount * profitRatio
						} else if purchasePrice <= 0 {
							totalProfit += pay.Amount
						}
					}
				}
			}
		}
		payCursor2.Close(nil)
	}

	// Daily Breakdown
	type dayEntry struct {
		Date  string  `json:"date"`
		Total float64 `json:"total"`
		Count int     `json:"count"`
	}
	dailyMap := make(map[string]*dayEntry)

	payCursor3, err := db.Collection("payments").Find(nil, bson.M{
		"transactiondate": bson.M{"$gte": monthStart, "$lt": monthEnd},
	})
	if err == nil {
		for payCursor3.Next(nil) {
			var pay domain.Payment
			if payCursor3.Decode(&pay) == nil {
				dateKey := pay.TransactionDate.Format("2006-01-02")
				if _, ok := dailyMap[dateKey]; !ok {
					dailyMap[dateKey] = &dayEntry{Date: dateKey}
				}
				dailyMap[dateKey].Total += pay.Amount
				dailyMap[dateKey].Count++
			}
		}
		payCursor3.Close(nil)
	}

	var dailyBreakdown []dayEntry
	for _, entry := range dailyMap {
		dailyBreakdown = append(dailyBreakdown, *entry)
	}
	sort.Slice(dailyBreakdown, func(i, j int) bool {
		return dailyBreakdown[i].Date < dailyBreakdown[j].Date
	})
	if dailyBreakdown == nil {
		dailyBreakdown = []dayEntry{}
	}

	// Daybook Details
	type daybookDetail struct {
		Date         string  `json:"date"`
		CustomerName string  `json:"customer_name"`
		CustomerUrdu string  `json:"customer_name_urdu"`
		Amount       float64 `json:"amount"`
		Method       string  `json:"method"`
		PlanID       string  `json:"plan_id"`
		Description  string  `json:"description"`
	}

	var daybookDetails []daybookDetail
	payCursor4, err := db.Collection("payments").Find(nil, bson.M{
		"transactiondate": bson.M{"$gte": monthStart, "$lt": monthEnd},
	})
	if err == nil {
		for payCursor4.Next(nil) {
			var pay domain.Payment
			if payCursor4.Decode(&pay) == nil {
				custName := ""
				custUrdu := ""
				desc := ""
				var plan domain.InstallmentPlan
				if err := db.Collection("installment_plans").FindOne(nil, bson.M{"_id": pay.InstallmentPlanID}).Decode(&plan); err == nil {
					cust := getCustomer(db, plan.CustomerID)
					if cust != nil {
						custName = cust.Name
						custUrdu = cust.NameUrdu
					}
					desc = fmt.Sprintf("Installment payment for %s", plan.ID)
				}
				daybookDetails = append(daybookDetails, daybookDetail{
					Date:         pay.TransactionDate.Format("2006-01-02"),
					CustomerName: custName,
					CustomerUrdu: custUrdu,
					Amount:       pay.Amount,
					Method:       pay.Method,
					PlanID:       pay.InstallmentPlanID,
					Description:  desc,
				})
			}
		}
		payCursor4.Close(nil)
	}
	if daybookDetails == nil {
		daybookDetails = []daybookDetail{}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"total_collection": totalCollection,
		"total_customers":  totalCustomers,
		"new_customers":    newCustomers,
		"total_profit":     totalProfit,
		"daily_breakdown":  dailyBreakdown,
		"daybook_details":  daybookDetails,
	})
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

	cursor, err := db.Collection("installment_plans").Find(nil, bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err != nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer cursor.Close(nil)

	var result []map[string]interface{}
	for cursor.Next(nil) {
		var plan domain.InstallmentPlan
		if cursor.Decode(&plan) != nil {
			continue
		}
		cust := getCustomer(db, plan.CustomerID)
		if cust == nil {
			continue
		}

		var prodName string
		if plan.ProductID != "" {
			prod := getProduct(db, plan.ProductID)
			if prod != nil {
				prodName = prod.Name
			}
		}

		for _, d := range plan.Installments {
			if d.Paid {
				continue
			}
			if !d.DueDate.Before(todayStart) {
				continue
			}

			totalPaidOnPlan := 0.0
			payC, _ := db.Collection("payments").Find(nil, bson.M{"installmentplanid": plan.ID})
			if payC != nil {
				for payC.Next(nil) {
					var pay domain.Payment
					if payC.Decode(&pay) == nil {
						totalPaidOnPlan += pay.Amount
					}
				}
				payC.Close(nil)
			}
			planRemaining := plan.TotalAmount - plan.DownPayment - totalPaidOnPlan
			if planRemaining < 0 {
				planRemaining = 0
			}

			paidCount := 0
			for _, inst := range plan.Installments {
				if inst.Paid {
					paidCount++
				}
			}

			item := map[string]interface{}{
				"plan_id":             plan.ID,
				"customer_id":         cust.ID,
				"customer_name":       cust.Name,
				"customer_urdu":       cust.NameUrdu,
				"father_name":         cust.FatherName,
				"phone":               cust.Phone,
				"cnic":                cust.CNIC,
				"address":             cust.Address,
				"address_urdu":        cust.AddressUrdu,
				"product_name":        prodName,
				"installment_no":      d.InstallmentNo,
				"due_date":            d.DueDate.Format("2006-01-02"),
				"amount":              d.Amount,
				"fine":                d.Fine,
				"days_overdue":        int(time.Since(d.DueDate).Hours() / 24),
				"total_installments":  plan.NumberOfInstallments,
				"paid_count":          paidCount,
				"remaining":           planRemaining,
				"total_amount":        plan.TotalAmount,
				"down_payment":        plan.DownPayment,
				"created_at":          plan.CreatedAt.Format("2006-01-02"),
			}
			result = append(result, item)
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

	todayStart, todayEnd := todayRange()

	cursor, err := db.Collection("installment_plans").Find(nil, bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err != nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer cursor.Close(nil)

	var result []map[string]interface{}
	for cursor.Next(nil) {
		var plan domain.InstallmentPlan
		if cursor.Decode(&plan) != nil {
			continue
		}
		cust := getCustomer(db, plan.CustomerID)
		if cust == nil {
			continue
		}

		var prodName string
		if plan.ProductID != "" {
			prod := getProduct(db, plan.ProductID)
			if prod != nil {
				prodName = prod.Name
			}
		}

		for _, d := range plan.Installments {
			if d.Paid {
				continue
			}
			if d.DueDate.Before(todayStart) || d.DueDate.After(todayEnd) {
				continue
			}

			totalPaidOnPlan := 0.0
			payC, _ := db.Collection("payments").Find(nil, bson.M{"installmentplanid": plan.ID})
			if payC != nil {
				for payC.Next(nil) {
					var pay domain.Payment
					if payC.Decode(&pay) == nil {
						totalPaidOnPlan += pay.Amount
					}
				}
				payC.Close(nil)
			}
			planRemaining := plan.TotalAmount - plan.DownPayment - totalPaidOnPlan
			if planRemaining < 0 {
				planRemaining = 0
			}

			paidCount := 0
			for _, inst := range plan.Installments {
				if inst.Paid {
					paidCount++
				}
			}

			item := map[string]interface{}{
				"plan_id":             plan.ID,
				"customer_id":         cust.ID,
				"customer_name":       cust.Name,
				"customer_urdu":       cust.NameUrdu,
				"father_name":         cust.FatherName,
				"phone":               cust.Phone,
				"cnic":                cust.CNIC,
				"address":             cust.Address,
				"address_urdu":        cust.AddressUrdu,
				"product_name":        prodName,
				"installment_no":      d.InstallmentNo,
				"due_date":            d.DueDate.Format("2006-01-02"),
				"amount":              d.Amount,
				"fine":                d.Fine,
				"total_installments":  plan.NumberOfInstallments,
				"paid_count":          paidCount,
				"remaining":           planRemaining,
				"total_amount":        plan.TotalAmount,
				"down_payment":        plan.DownPayment,
				"created_at":          plan.CreatedAt.Format("2006-01-02"),
			}
			result = append(result, item)
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

	cursor, err := db.Collection("products").Find(nil, bson.M{})
	if err != nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer cursor.Close(nil)

	var result []map[string]interface{}
	for cursor.Next(nil) {
		var prod domain.Product
		if cursor.Decode(&prod) != nil {
			continue
		}
		if prod.StockCount > 5 {
			continue
		}

		result = append(result, map[string]interface{}{
			"id":                 prod.ID,
			"name":               prod.Name,
			"name_urdu":          prod.NameUrdu,
			"category":           prod.Category,
			"stock_quantity":     prod.StockCount,
			"low_stock_threshold": 5,
			"purchase_price":     prod.PurchasePrice,
			"price":              prod.Price,
		})
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

	cursor, err := db.Collection("installment_plans").Find(nil, bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err != nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer cursor.Close(nil)

	var result []map[string]interface{}
	for cursor.Next(nil) {
		var plan domain.InstallmentPlan
		if cursor.Decode(&plan) != nil {
			continue
		}
		cust := getCustomer(db, plan.CustomerID)
		if cust == nil {
			continue
		}

		var prodName string
		if plan.ProductID != "" {
			prod := getProduct(db, plan.ProductID)
			if prod != nil {
				prodName = prod.Name
			}
		}

		for _, d := range plan.Installments {
			if d.Paid {
				continue
			}
			if d.DueDate.Before(monthStart) || d.DueDate.After(monthEnd) {
				continue
			}

			totalPaidOnPlan := 0.0
			payC, _ := db.Collection("payments").Find(nil, bson.M{"installmentplanid": plan.ID})
			if payC != nil {
				for payC.Next(nil) {
					var pay domain.Payment
					if payC.Decode(&pay) == nil {
						totalPaidOnPlan += pay.Amount
					}
				}
				payC.Close(nil)
			}
			planRemaining := plan.TotalAmount - plan.DownPayment - totalPaidOnPlan
			if planRemaining < 0 {
				planRemaining = 0
			}

			paidCount := 0
			for _, inst := range plan.Installments {
				if inst.Paid {
					paidCount++
				}
			}

			item := map[string]interface{}{
				"plan_id":             plan.ID,
				"customer_id":         cust.ID,
				"customer_name":       cust.Name,
				"customer_urdu":       cust.NameUrdu,
				"father_name":         cust.FatherName,
				"phone":               cust.Phone,
				"cnic":                cust.CNIC,
				"address":             cust.Address,
				"address_urdu":        cust.AddressUrdu,
				"product_name":        prodName,
				"installment_no":      d.InstallmentNo,
				"due_date":            d.DueDate.Format("2006-01-02"),
				"amount":              d.Amount,
				"fine":                d.Fine,
				"total_installments":  plan.NumberOfInstallments,
				"paid_count":          paidCount,
				"remaining":           planRemaining,
				"total_amount":        plan.TotalAmount,
				"down_payment":        plan.DownPayment,
				"created_at":          plan.CreatedAt.Format("2006-01-02"),
			}
			result = append(result, item)
		}
	}

	if result == nil {
		result = []map[string]interface{}{}
	}
	respondJSON(w, http.StatusOK, result)
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

	cursor, err := db.Collection("installment_plans").Find(nil, bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err != nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer cursor.Close(nil)

	var result []map[string]interface{}
	for cursor.Next(nil) {
		var plan domain.InstallmentPlan
		if cursor.Decode(&plan) != nil {
			continue
		}
		cust := getCustomer(db, plan.CustomerID)
		if cust == nil {
			continue
		}

		var prodName string
		if plan.ProductID != "" {
			prod := getProduct(db, plan.ProductID)
			if prod != nil {
				prodName = prod.Name
			}
		}

		totalPaidOnPlan := 0.0
		payC, _ := db.Collection("payments").Find(nil, bson.M{"installmentplanid": plan.ID})
		if payC != nil {
			for payC.Next(nil) {
				var pay domain.Payment
				if payC.Decode(&pay) == nil {
					totalPaidOnPlan += pay.Amount
				}
			}
			payC.Close(nil)
		}
		planRemaining := plan.TotalAmount - plan.DownPayment - totalPaidOnPlan
		if planRemaining < 0 {
			planRemaining = 0
		}

		paidCount := 0
		overdueCount := 0
		now := time.Now()
		todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		for _, d := range plan.Installments {
			if d.Paid {
				paidCount++
			} else if d.DueDate.Before(todayStart) {
				overdueCount++
			}
		}

		result = append(result, map[string]interface{}{
			"plan_id":              plan.ID,
			"customer_id":          cust.ID,
			"customer_name":        cust.Name,
			"customer_urdu":        cust.NameUrdu,
			"father_name":          cust.FatherName,
			"phone":                cust.Phone,
			"cnic":                 cust.CNIC,
			"address":              cust.Address,
			"address_urdu":         cust.AddressUrdu,
			"product_name":         prodName,
			"total_amount":         plan.TotalAmount,
			"down_payment":         plan.DownPayment,
			"paid_amount":          totalPaidOnPlan,
			"remaining":            planRemaining,
			"total_installments":   plan.NumberOfInstallments,
			"paid_installments":    paidCount,
			"overdue_installments": overdueCount,
			"status":               plan.Status,
			"created_at":           plan.CreatedAt.Format("2006-01-02"),
			"created_by":           plan.CreatedBy,
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

	cursor, err := db.Collection("installment_plans").Find(nil, bson.M{
		"status": bson.M{"$in": []string{"completed", "Completed", "Closed", "paid"}},
	})
	if err != nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer cursor.Close(nil)

	var result []map[string]interface{}
	for cursor.Next(nil) {
		var plan domain.InstallmentPlan
		if cursor.Decode(&plan) != nil {
			continue
		}
		cust := getCustomer(db, plan.CustomerID)
		if cust == nil {
			continue
		}

		var prodName string
		if plan.ProductID != "" {
			prod := getProduct(db, plan.ProductID)
			if prod != nil {
				prodName = prod.Name
			}
		}

		totalPaidOnPlan := 0.0
		payC, _ := db.Collection("payments").Find(nil, bson.M{"installmentplanid": plan.ID})
		if payC != nil {
			for payC.Next(nil) {
				var pay domain.Payment
				if payC.Decode(&pay) == nil {
					totalPaidOnPlan += pay.Amount
				}
			}
			payC.Close(nil)
		}

		paidCount := 0
		for _, d := range plan.Installments {
			if d.Paid {
				paidCount++
			}
		}

		completedAt := ""
		if plan.CompletedDate != nil {
			completedAt = plan.CompletedDate.Format("2006-01-02")
		} else {
			completedAt = plan.UpdatedAt.Format("2006-01-02")
		}

		result = append(result, map[string]interface{}{
			"plan_id":             plan.ID,
			"customer_id":         cust.ID,
			"customer_name":       cust.Name,
			"customer_urdu":       cust.NameUrdu,
			"father_name":         cust.FatherName,
			"phone":               cust.Phone,
			"cnic":                cust.CNIC,
			"address":             cust.Address,
			"address_urdu":        cust.AddressUrdu,
			"product_name":        prodName,
			"total_amount":        plan.TotalAmount,
			"down_payment":        plan.DownPayment,
			"paid_amount":         totalPaidOnPlan,
			"total_installments":  plan.NumberOfInstallments,
			"paid_installments":   paidCount,
			"status":              plan.Status,
			"created_at":          plan.CreatedAt.Format("2006-01-02"),
			"completed_at":        completedAt,
			"created_by":          plan.CreatedBy,
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

	cursor, err := db.Collection("installment_plans").Find(nil, bson.M{
		"status": bson.M{"$in": []string{"active", "Active", "Open"}},
	})
	if err != nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer cursor.Close(nil)

	custMap := make(map[string]map[string]interface{})
	for cursor.Next(nil) {
		var plan domain.InstallmentPlan
		if cursor.Decode(&plan) != nil {
			continue
		}

		if _, ok := custMap[plan.CustomerID]; !ok {
			cust := getCustomer(db, plan.CustomerID)
			if cust == nil {
				continue
			}
			custMap[plan.CustomerID] = map[string]interface{}{
				"customer_id":        cust.ID,
				"customer_name":      cust.Name,
				"customer_name_urdu": cust.NameUrdu,
				"father_name":        cust.FatherName,
				"phone":              cust.Phone,
				"cnic":               cust.CNIC,
				"address":            cust.Address,
				"address_urdu":       cust.AddressUrdu,
				"total_plans":        0,
				"total_amount":       0.0,
				"paid_amount":        0.0,
				"remaining_amount":   0.0,
			}
		}

		entry := custMap[plan.CustomerID]
		entry["total_plans"] = entry["total_plans"].(int) + 1
		entry["total_amount"] = entry["total_amount"].(float64) + plan.TotalAmount

		totalPaidOnPlan := 0.0
		payC, _ := db.Collection("payments").Find(nil, bson.M{"installmentplanid": plan.ID})
		if payC != nil {
			for payC.Next(nil) {
				var pay domain.Payment
				if payC.Decode(&pay) == nil {
					totalPaidOnPlan += pay.Amount
				}
			}
			payC.Close(nil)
		}
		entry["paid_amount"] = entry["paid_amount"].(float64) + totalPaidOnPlan
		remaining := plan.TotalAmount - plan.DownPayment - totalPaidOnPlan
		if remaining < 0 {
			remaining = 0
		}
		entry["remaining_amount"] = entry["remaining_amount"].(float64) + remaining
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


