package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/middleware"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func SetupRouter(
	cfg *config.Config,
	custSvc *service.CustomerService,
	guarSvc *service.GuarantorService,
	prodSvc *service.ProductService,
	invSvc *service.InventoryService,
	planSvc *service.InstallmentService,
	paySvc *service.PaymentService,
	accSvc *service.AccountingService,
	notifSvc *service.NotificationService,
	recSvc *service.ReceiptService,
	userSvc *service.UserService,
	expenseSvc *service.ExpenseService,
	settingsRepo repository.SettingsRepository,
) *mux.Router {

	r := mux.NewRouter()

	installmentH := NewInstallmentHandler(planSvc, guarSvc)
	customerH := NewCustomerHandler(custSvc, guarSvc)
	guarantorH := NewGuarantorHandler(guarSvc, custSvc)
	productH := NewProductHandler(prodSvc)
	inventoryH := NewInventoryHandler(invSvc, prodSvc)
	paymentH := NewPaymentHandler(paySvc)
	accountingH := NewAccountingHandler(accSvc)
	notificationH := NewNotificationHandler(notifSvc)
	receiptH := NewReceiptHandler(recSvc, planSvc, custSvc, prodSvc, guarSvc, cfg)
	userH := NewUserHandler(userSvc)
	authH := NewAuthHandler(userSvc, cfg)
	adminH := NewAdminHandler(userSvc, settingsRepo)
	dashboardH := NewDashboardHandler()
	expenseH := NewExpenseHandler()
	promiseH := NewPromiseHandler()

	api := r.PathPrefix("/api").Subrouter()

	// ========== PUBLIC ROUTES ==========
	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		respondJSON(w, http.StatusOK, map[string]interface{}{"status": "ok", "message": "Server is running"})
	}).Methods("GET")
	api.HandleFunc("/auth/login", authH.Login).Methods("POST")
	api.HandleFunc("/license/validate", adminH.ValidateLicenseAPI).Methods("POST")
	api.HandleFunc("/license/status", adminH.GetLicenseStatus).Methods("GET")
	api.HandleFunc("/auth/debug", authH.LoginDebug).Methods("POST")

	// ========== PROTECTED ROUTES ==========
	protected := api.NewRoute().Subrouter()
	protected.Use(middleware.AuthMiddleware(cfg))

	// Admin-only routes
	admin := protected.PathPrefix("/admin").Subrouter()
	admin.Use(middleware.AdminOnly)
	admin.HandleFunc("/backup", adminH.Backup).Methods("GET", "POST")
	admin.HandleFunc("/restore", adminH.Restore).Methods("POST")
	admin.HandleFunc("/backup/email", adminH.SendEmailBackup).Methods("POST")
	admin.HandleFunc("/backup/settings", adminH.GetBackupSettings).Methods("GET")
	admin.HandleFunc("/backup/settings", adminH.UpdateBackupSettings).Methods("PUT")
	admin.HandleFunc("/users", userH.List).Methods("GET")
	admin.HandleFunc("/users", userH.Create).Methods("POST")
	admin.HandleFunc("/users/{id}", userH.Update).Methods("PUT")
	admin.HandleFunc("/users/{id}", userH.Delete).Methods("DELETE")
	admin.HandleFunc("/settings", adminH.GetSettings).Methods("GET")
	admin.HandleFunc("/settings", adminH.UpdateSettings).Methods("PUT")

	// SSE real-time events endpoint
	protected.Handle("/events", GlobalSSEHub).Methods("GET")

	// Password change
	protected.HandleFunc("/auth/change-password", userH.ChangePassword).Methods("POST", "PUT")

	// Audit logs (MongoDB-based)
	protected.HandleFunc("/audit-logs", func(w http.ResponseWriter, r *http.Request) {
		db := config.MongoDatabase
		if db == nil {
			respondJSON(w, http.StatusOK, map[string]interface{}{"logs": []interface{}{}, "total": 0, "page": 1, "limit": 50})
			return
		}

		pageStr := r.URL.Query().Get("page")
		limitStr := r.URL.Query().Get("limit")
		page, _ := strconv.Atoi(pageStr)
		limit, _ := strconv.Atoi(limitStr)
		if page < 1 {
			page = 1
		}
		if limit < 1 || limit > 100 {
			limit = 50
		}

		total, err := db.Collection("audit_logs").CountDocuments(r.Context(), bson.M{})
		if err != nil {
			total = 0
		}

		skip := int64((page - 1) * limit)
		opts := options.Find().SetSkip(skip).SetLimit(int64(limit)).SetSort(bson.D{{Key: "timestamp", Value: -1}})
		cursor, err := db.Collection("audit_logs").Find(r.Context(), bson.M{}, opts)
		if err != nil {
			respondJSON(w, http.StatusOK, map[string]interface{}{"logs": []interface{}{}, "total": total, "page": page, "limit": limit})
			return
		}
		defer cursor.Close(r.Context())

		var logs []map[string]interface{}
		for cursor.Next(r.Context()) {
			var logEntry map[string]interface{}
			if err := cursor.Decode(&logEntry); err != nil {
				continue
			}
			// Lookup user name from MongoDB users collection
			if userID, ok := logEntry["user_id"].(string); ok && userID != "" {
				var userName string
				// Try lookup by _id first, then by "id" (legacy)
				for _, field := range []string{"_id", "id"} {
					var user domain.User
					err := db.Collection("users").FindOne(r.Context(), bson.M{field: userID}).Decode(&user)
					if err == nil {
						if user.DisplayName != "" {
							userName = user.DisplayName
						} else {
							userName = user.Username
						}
						break
					}
				}
				if userName != "" {
					logEntry["user_name"] = userName
				}
			}
			logs = append(logs, logEntry)
		}
		if logs == nil {
			logs = []map[string]interface{}{}
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"logs": logs, "total": total, "page": page, "limit": limit,
		})
	}).Methods("GET")

	// Customers
	protected.HandleFunc("/customers", customerH.List).Methods("GET")
	protected.HandleFunc("/customers", customerH.Create).Methods("POST")
	protected.HandleFunc("/customers/search", customerH.Search).Methods("GET")
	protected.HandleFunc("/customers/{id}", customerH.GetByID).Methods("GET")
	protected.HandleFunc("/customers/{id}", customerH.Update).Methods("PUT")
	protected.HandleFunc("/customers/{id}", customerH.Delete).Methods("DELETE")
	protected.HandleFunc("/customers/{id}/history", customerH.GetHistory).Methods("GET")

	// Guarantors
	protected.HandleFunc("/guarantors", guarantorH.List).Methods("GET")
	protected.HandleFunc("/guarantors", guarantorH.Create).Methods("POST")
	protected.HandleFunc("/guarantors/{id}", guarantorH.GetByID).Methods("GET")
	protected.HandleFunc("/guarantors/{id}", guarantorH.Update).Methods("PUT")
	protected.HandleFunc("/guarantors/{id}", guarantorH.Delete).Methods("DELETE")
	protected.HandleFunc("/guarantors/customer", guarantorH.ListByCustomer).Methods("GET")

	// Products
	protected.HandleFunc("/products", productH.List).Methods("GET")
	protected.HandleFunc("/products", productH.Create).Methods("POST")
	protected.HandleFunc("/products/search", productH.Search).Methods("GET")
	protected.HandleFunc("/products/bulk-delete", productH.BulkDelete).Methods("POST")
	protected.HandleFunc("/products/low-stock", productH.GetLowStock).Methods("GET")
	protected.HandleFunc("/products/{id}", productH.GetByID).Methods("GET")
	protected.HandleFunc("/products/{id}", productH.Update).Methods("PUT")
	protected.HandleFunc("/products/{id}", productH.Delete).Methods("DELETE")


	// Inventory
	protected.HandleFunc("/inventory", inventoryH.List).Methods("GET")
	protected.HandleFunc("/inventory", inventoryH.Create).Methods("POST")
	protected.HandleFunc("/inventory/ageing", inventoryH.AgeingReport).Methods("GET")
	protected.HandleFunc("/inventory/add-stock", inventoryH.AddStock).Methods("POST")
	protected.HandleFunc("/inventory/remove-stock", inventoryH.RemoveStock).Methods("POST")
	protected.HandleFunc("/inventory/{id}", inventoryH.GetByID).Methods("GET")
	protected.HandleFunc("/inventory/{id}", inventoryH.Update).Methods("PUT")
	protected.HandleFunc("/inventory/{id}", inventoryH.Delete).Methods("DELETE")
	protected.HandleFunc("/inventory/{id}/return", inventoryH.ReturnItem).Methods("PUT")

	// Installments
	protected.HandleFunc("/installments", installmentH.ListAll).Methods("GET")
	protected.HandleFunc("/installments", installmentH.Create).Methods("POST")
	protected.HandleFunc("/installments/payment", installmentH.RecordPayment).Methods("POST")
	protected.HandleFunc("/installments/bulk-payment", installmentH.BulkPayment).Methods("POST")
	protected.HandleFunc("/installments/advance", installmentH.AdvancePayment).Methods("POST")
	protected.HandleFunc("/installments/customer/{id}", installmentH.ListByCustomer).Methods("GET")
	protected.HandleFunc("/installments/customer", installmentH.ListByCustomer).Methods("GET")
	protected.HandleFunc("/installments/reschedule", installmentH.Reschedule).Methods("POST")
	protected.HandleFunc("/installments/undo-payment", installmentH.UndoPayment).Methods("POST")

	// Payments (unique routes only - no duplicates with /installments routes)
	protected.HandleFunc("/payments", installmentH.RecordPayment).Methods("POST")
	protected.HandleFunc("/payments/advance", installmentH.AdvancePayment).Methods("POST")
	protected.HandleFunc("/payments/bulk", installmentH.BulkPayment).Methods("POST")
	protected.HandleFunc("/payments/plan/{plan_id}", paymentH.ListByPlan).Methods("GET")

	// Upcoming installments (MongoDB-based)
	protected.HandleFunc("/installments/upcoming", func(w http.ResponseWriter, r *http.Request) {
		db := config.MongoDatabase
		if db == nil {
			respondJSON(w, http.StatusOK, []interface{}{})
			return
		}

		daysStr := r.URL.Query().Get("days")
		days, err := strconv.Atoi(daysStr)
		if err != nil || days <= 0 {
			days = 1
		}

		now := time.Now()
		today := now.Truncate(24 * time.Hour)
		var start, end time.Time
		switch days {
		case 1:
			start = time.Date(2020, 1, 1, 0, 0, 0, 0, now.Location())
			end = today.AddDate(0, 0, 1)
		case 7:
			weekday := now.Weekday()
			daysUntilSunday := 6 - int(weekday)
			currentWeekEnd := today.AddDate(0, 0, daysUntilSunday+1)
			start = time.Date(2020, 1, 1, 0, 0, 0, 0, now.Location())
			end = currentWeekEnd
		case 30:
			year, month, _ := now.Date()
			currentMonthStart := time.Date(year, month, 1, 0, 0, 0, 0, now.Location())
			start = time.Date(2020, 1, 1, 0, 0, 0, 0, now.Location())
			end = currentMonthStart.AddDate(0, 1, 0)
		default:
			start = today
			end = today.AddDate(0, 0, days)
		}

		// Get active plans
		cursor, err := db.Collection("installment_plans").Find(r.Context(), bson.M{
			"status": bson.M{"$in": []string{"active", "Open"}},
		})
		if err != nil {
			respondJSON(w, http.StatusOK, []interface{}{})
			return
		}
		defer cursor.Close(r.Context())

		var result []map[string]interface{}
		for cursor.Next(r.Context()) {
			var plan domain.InstallmentPlan
			if err := cursor.Decode(&plan); err != nil {
				continue
			}

			// Get customer
			var cust domain.Customer
			if err := db.Collection("customers").FindOne(r.Context(), bson.M{"_id": plan.CustomerID}).Decode(&cust); err != nil {
				continue
			}

			// Get product
			var prodName string
			if plan.ProductID != "" {
				var prod domain.Product
				if err := db.Collection("products").FindOne(r.Context(), bson.M{"_id": plan.ProductID}).Decode(&prod); err == nil {
					prodName = prod.Name
				}
			}

			// Check details for due installments
			for _, detail := range plan.Installments {
				if detail.Paid {
					continue
				}
				if detail.DueDate.Before(start) || detail.DueDate.After(end) {
					continue
				}

				item := map[string]interface{}{
					"id":                 plan.ID,
					"customer_name":      cust.Name,
					"customer_urdu":      cust.NameUrdu,
					"father_name":        cust.FatherName,
					"phone":              cust.Phone,
				"cnic":               cust.CNIC,
					"address":            cust.Address,
					"address_urdu":       cust.AddressUrdu,
					"product_name":       prodName,
					"installment_no":     detail.InstallmentNo,
					"due_date":           detail.DueDate.Format("2006-01-02"),
					"amount":             detail.Amount,
					"paid":               detail.Paid,
					"partial_paid":       detail.PartialPaid,
				"total_installments": plan.NumberOfInstallments,
				}
				if detail.PaidDate != nil {
					item["paid_date"] = detail.PaidDate.Format("2006-01-02")
				}
				result = append(result, item)
			}
		}
		if result == nil {
			result = []map[string]interface{}{}
		}
		respondJSON(w, http.StatusOK, result)
	}).Methods("GET")

	// Detailed report
	protected.HandleFunc("/installments/detailed-report", func(w http.ResponseWriter, r *http.Request) {
		db := config.MongoDatabase
		if db == nil {
			respondJSON(w, http.StatusOK, []interface{}{})
			return
		}

		daysStr := r.URL.Query().Get("days")
		days, err := strconv.Atoi(daysStr)
		if err != nil || days <= 0 {
			days = 1
		}
		now := time.Now()
		today := now.Truncate(24 * time.Hour)
		var start, end time.Time
		switch days {
		case 1:
			start = time.Date(2020, 1, 1, 0, 0, 0, 0, now.Location())
			end = today.AddDate(0, 0, 1)
		case 7:
			weekday := now.Weekday()
			daysUntilSunday := 6 - int(weekday)
			currentWeekEnd := today.AddDate(0, 0, daysUntilSunday+1)
			start = time.Date(2020, 1, 1, 0, 0, 0, 0, now.Location())
			end = currentWeekEnd
		case 30:
			year, month, _ := now.Date()
			currentMonthStart := time.Date(year, month, 1, 0, 0, 0, 0, now.Location())
			start = time.Date(2020, 1, 1, 0, 0, 0, 0, now.Location())
			end = currentMonthStart.AddDate(0, 1, 0)
		default:
			start = today
			end = today.AddDate(0, 0, days)
		}

		cursor, err := db.Collection("installment_plans").Find(r.Context(), bson.M{
			"status": "active",
		})
		if err != nil {
			respondJSON(w, http.StatusOK, []interface{}{})
			return
		}
		defer cursor.Close(r.Context())

		var result []map[string]interface{}
		for cursor.Next(r.Context()) {
			var plan domain.InstallmentPlan
			if err := cursor.Decode(&plan); err != nil {
				continue
			}

		// Check if any installment is due in range
			hasDue := false
			for _, d := range plan.Installments {
				if !d.Paid && (d.DueDate.Equal(start) || d.DueDate.After(start)) && d.DueDate.Before(end) {
					hasDue = true
					break
				}
			}
			if !hasDue {
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

			// Get payments
			payCursor, _ := db.Collection("payments").Find(r.Context(), bson.M{"installmentplanid": plan.ID})
			var payments []map[string]interface{}
			if payCursor != nil {
				for payCursor.Next(r.Context()) {
					var pay domain.Payment
					if payCursor.Decode(&pay) == nil {
						payments = append(payments, map[string]interface{}{
							"id": pay.ID, "amount": pay.Amount, "method": pay.Method,
							"transaction_date": pay.TransactionDate,
						})
					}
				}
				payCursor.Close(r.Context())
			}
			if payments == nil {
				payments = []map[string]interface{}{}
			}

			// Get guarantors
			guarCursor, _ := db.Collection("guarantors").Find(r.Context(), bson.M{"customerid": plan.CustomerID})
			var guarantors []map[string]interface{}
			if guarCursor != nil {
				for guarCursor.Next(r.Context()) {
					var guar domain.Guarantor
					if guarCursor.Decode(&guar) == nil {
						guarantors = append(guarantors, map[string]interface{}{
							"id": guar.ID, "name": guar.Name, "phone": guar.Phone,
						})
					}
				}
				guarCursor.Close(r.Context())
			}
			if guarantors == nil {
				guarantors = []map[string]interface{}{}
			}

			// Filter installments in range
			var installments []map[string]interface{}
			for _, d := range plan.Installments {
				if (d.DueDate.Equal(start) || d.DueDate.After(start)) && d.DueDate.Before(end) {
					item := map[string]interface{}{
						"installment_no": d.InstallmentNo, "due_date": d.DueDate.Format("2006-01-02"),
						"amount": d.Amount, "paid": d.Paid, "partial_paid": d.PartialPaid,
						"remaining": d.Remaining, "collected_by": d.CollectedBy, "collected_by_id": d.CollectedById,
					}
					if d.PaidDate != nil {
						item["paid_date"] = d.PaidDate.Format("2006-01-02")
					}
					installments = append(installments, item)
				}
			}
			if installments == nil {
				installments = []map[string]interface{}{}
			}

			result = append(result, map[string]interface{}{
				"id": plan.ID, "customer_name": cust.Name, "customer_urdu": cust.NameUrdu,
				"father_name": cust.FatherName, "phone": cust.Phone, "cnic": cust.CNIC,
				"address": cust.Address, "address_urdu": cust.AddressUrdu,
				"product_name": prodName, "product_name_urdu": prodNameUrdu,
				"total_amount": plan.TotalAmount, "down_payment": plan.DownPayment,
				"remaining_amount": plan.RemainingAmount, "num_installments": plan.NumberOfInstallments,
				"installments": installments, "payments": payments, "guarantors": guarantors,
				"created_at": plan.CreatedAt.Format("2006-01-02"), "created_by": plan.CreatedBy,
			})
		}
		if result == nil {
			result = []map[string]interface{}{}
		}
		respondJSON(w, http.StatusOK, result)
	}).Methods("GET")

	protected.HandleFunc("/installments/{id}", installmentH.GetByID).Methods("GET")
	protected.HandleFunc("/installments/{id}", installmentH.Delete).Methods("DELETE")

	// Accounting
	protected.HandleFunc("/accounting/today", accountingH.TodaySummary).Methods("GET")
	protected.HandleFunc("/accounting/month", accountingH.MonthSummary).Methods("GET")
	protected.HandleFunc("/accounting/profit-loss/cash", accountingH.ProfitLossCashFlow).Methods("GET")
	protected.HandleFunc("/accounting/profit-loss/accrual", accountingH.ProfitLossAccrual).Methods("GET")

	// Pending total (MongoDB-based)
	protected.HandleFunc("/accounting/pending-total", func(w http.ResponseWriter, r *http.Request) {
		db := config.MongoDatabase
		if db == nil {
			respondJSON(w, http.StatusOK, map[string]interface{}{"pending_total": 0, "customers": []interface{}{}})
			return
		}

		// Get all active plans - check all possible status values
		cursor, err := db.Collection("installment_plans").Find(r.Context(), bson.M{"status": bson.M{"$in": []string{"active", "Active", "Open"}}})
		if err != nil {
			respondJSON(w, http.StatusOK, map[string]interface{}{"pending_total": 0, "customers": []interface{}{}})
			return
		}
		defer cursor.Close(r.Context())

		var pendingTotal float64
		customerMap := make(map[string]map[string]interface{})
		// Track unique product names per customer
		customerProducts := make(map[string]map[string]bool)
		// Track plan IDs per customer
		customerPlanIDs := make(map[string][]string)

		for cursor.Next(r.Context()) {
			var plan domain.InstallmentPlan
			if err := cursor.Decode(&plan); err != nil {
				continue
			}

			// Calculate total paid on this plan
			// NOTE: Down payment is already stored as a payment in the payments collection
			// so we should NOT add plan.DownPayment separately (it would be double-counted)
			totalPaidOnPlan := 0.0
			// Fetch payments from payments collection to get accurate total (includes down payment)
			// Use $or to handle both camelCase and lowercase field names
			payCur, err := db.Collection("payments").Find(r.Context(), bson.M{
				"$or": []interface{}{
					bson.M{"installmentplanid": plan.ID},
					bson.M{"installmentPlanId": plan.ID},
				},
			})
			if err == nil {
				for payCur.Next(r.Context()) {
					var pay domain.Payment
					if payCur.Decode(&pay) == nil {
						totalPaidOnPlan += pay.Amount
					}
				}
				payCur.Close(r.Context())
			}

			// Calculate total amount that should be paid (all installments + down payment)
			totalInstallmentAmount := 0.0
			for _, d := range plan.Installments {
				totalInstallmentAmount += d.Amount
			}
			totalPlanAmount := plan.DownPayment + totalInstallmentAmount

			// Remaining = total plan amount - total paid
			planRemaining := totalPlanAmount - totalPaidOnPlan
			if planRemaining < 0 {
				planRemaining = 0
			}

			if planRemaining <= 0 {
				continue
			}

			pendingTotal += planRemaining

			// Track plan IDs per customer
			if _, exists := customerPlanIDs[plan.CustomerID]; !exists {
				customerPlanIDs[plan.CustomerID] = []string{}
			}
			customerPlanIDs[plan.CustomerID] = append(customerPlanIDs[plan.CustomerID], plan.ID)

			// Fetch product name for this plan
			if plan.ProductID != "" {
				if _, exists := customerProducts[plan.CustomerID]; !exists {
					customerProducts[plan.CustomerID] = make(map[string]bool)
				}
				var prod domain.Product
				if err := db.Collection("products").FindOne(r.Context(), bson.M{"_id": plan.ProductID}).Decode(&prod); err == nil {
					customerProducts[plan.CustomerID][prod.Name] = true
				}
			}

			if _, ok := customerMap[plan.CustomerID]; !ok {
				var cust domain.Customer
				if err := db.Collection("customers").FindOne(r.Context(), bson.M{"_id": plan.CustomerID}).Decode(&cust); err != nil {
					continue
				}
				customerMap[plan.CustomerID] = map[string]interface{}{
					"customer_id":         plan.CustomerID,
					"customer_name":       cust.Name,
					"customer_name_urdu":  cust.NameUrdu,
					"father_name":         cust.FatherName,
					"phone":               cust.Phone,
					"cnic":                cust.CNIC,
					"address":             cust.Address,
					"address_urdu":        cust.AddressUrdu,
					"pending_amount":      0.0,
					"installment_count":   0,
					"earliest_due_date":   "",
					"product_name":        "",
					"product_name_urdu":   "",
					"plan_ids":            []string{},
				}
			}
			if entry, ok := customerMap[plan.CustomerID]; ok {
				entry["pending_amount"] = entry["pending_amount"].(float64) + planRemaining
				// Count unpaid installments
				unpaidCount := 0
				for _, d := range plan.Installments {
					if !d.Paid {
						unpaidCount++
					}
				}
				entry["installment_count"] = entry["installment_count"].(int) + unpaidCount
				// Find earliest unpaid due date
				for _, d := range plan.Installments {
					if !d.Paid {
						earliest := entry["earliest_due_date"].(string)
						if earliest == "" || d.DueDate.Format("2006-01-02") < earliest {
							entry["earliest_due_date"] = d.DueDate.Format("2006-01-02")
						}
					}
				}
			}
		}

		// Build product name strings per customer (comma-separated unique names)
		for custID, entry := range customerMap {
			if prods, ok := customerProducts[custID]; ok {
				var names []string
				for name := range prods {
					names = append(names, name)
				}
				productName := ""
				for i, n := range names {
					if i > 0 {
						productName += ", "
					}
					productName += n
				}
				entry["product_name"] = productName
			}
			if planIDs, ok := customerPlanIDs[custID]; ok {
				entry["plan_ids"] = planIDs
			}
		}

		var customers []map[string]interface{}
		for _, v := range customerMap {
			customers = append(customers, v)
		}
		if customers == nil {
			customers = []map[string]interface{}{}
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"pending_total": pendingTotal,
			"totalPending":  pendingTotal,
			"customers":     customers,
		})
	}).Methods("GET")

	// Total paid (MongoDB-based)
	protected.HandleFunc("/accounting/total-paid", func(w http.ResponseWriter, r *http.Request) {
		db := config.MongoDatabase
		if db == nil {
			respondJSON(w, http.StatusOK, map[string]interface{}{"total_paid": 0, "customers": []interface{}{}})
			return
		}

		pipeline := mongo.Pipeline{
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: "$installment_plan_id"},
				{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
				{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
			}}},
		}

		cursor, err := db.Collection("payments").Aggregate(r.Context(), pipeline)
		if err != nil {
			respondJSON(w, http.StatusOK, map[string]interface{}{"total_paid": 0, "customers": []interface{}{}})
			return
		}
		defer cursor.Close(r.Context())

		var totalPaid float64
		var customers []map[string]interface{}

		for cursor.Next(r.Context()) {
			var result struct {
				PlanID string  `bson:"_id"`
				Total  float64 `bson:"total"`
				Count  int     `bson:"count"`
			}
			if err := cursor.Decode(&result); err != nil {
				continue
			}
			totalPaid += result.Total

			// Get plan and customer
			var plan domain.InstallmentPlan
			if err := db.Collection("installment_plans").FindOne(r.Context(), bson.M{"_id": result.PlanID}).Decode(&plan); err != nil {
				continue
			}
			var cust domain.Customer
			if err := db.Collection("customers").FindOne(r.Context(), bson.M{"_id": plan.CustomerID}).Decode(&cust); err != nil {
				continue
			}

			customers = append(customers, map[string]interface{}{
				"customerid": plan.CustomerID, "customer_name": cust.Name,
				"customer_name_urdu": cust.NameUrdu, "father_name": cust.FatherName,
				"phone": cust.Phone, "paid_amount": result.Total, "payment_count": result.Count,
			})
		}
		if customers == nil {
			customers = []map[string]interface{}{}
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{"total_paid": totalPaid, "customers": customers})
	}).Methods("GET")

	// Accounting summary
	protected.HandleFunc("/accounting/summary", func(w http.ResponseWriter, r *http.Request) {
		start, end, err := parseDateRange(r)
		if err != nil {
			respondError(w, r, http.StatusBadRequest, "Invalid date range", "غلط تاریخ کی حد")
			return
		}
		basis := r.URL.Query().Get("basis")
		if basis == "" {
			basis = "cash_flow"
		}

		db := config.MongoDatabase
		if db == nil {
			respondJSON(w, http.StatusOK, map[string]interface{}{"total_income": 0, "total_expense": 0, "net_profit": 0})
			return
		}

		pipeline := mongo.Pipeline{
			bson.D{{Key: "$match", Value: bson.D{
				{Key: "basis", Value: basis},
				{Key: "date", Value: bson.D{{Key: "$gte", Value: start}, {Key: "$lte", Value: end}}},
			}}},
			bson.D{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: "$type"},
				{Key: "total", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
			}}},
		}

		cursor, err := db.Collection("accounting_entries").Aggregate(r.Context(), pipeline)
		if err != nil {
			respondJSON(w, http.StatusOK, map[string]interface{}{"total_income": 0, "total_expense": 0, "net_profit": 0})
			return
		}
		defer cursor.Close(r.Context())

		var income, expense float64
		for cursor.Next(r.Context()) {
			var result struct {
				Type  string  `bson:"_id"`
				Total float64 `bson:"total"`
			}
			if cursor.Decode(&result) == nil {
				if result.Type == "income" {
					income = result.Total
				} else {
					expense = result.Total
				}
			}
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{"total_income": income, "total_expense": expense, "net_profit": income - expense})
	}).Methods("GET")

	// Product-wise accounting
	protected.HandleFunc("/accounting/product-wise", func(w http.ResponseWriter, r *http.Request) {
		db := config.MongoDatabase
		if db == nil {
			respondJSON(w, http.StatusOK, []interface{}{})
			return
		}

		cursor, err := db.Collection("installment_plans").Find(r.Context(), bson.M{"status": "active"})
		if err != nil {
			respondJSON(w, http.StatusOK, []interface{}{})
			return
		}
		defer cursor.Close(r.Context())

		categoryMap := make(map[string]map[string]float64)
		for cursor.Next(r.Context()) {
			var plan domain.InstallmentPlan
			if cursor.Decode(&plan) != nil {
				continue
			}

			category := "Uncategorized"
			if plan.ProductID != "" {
				var prod domain.Product
				if err := db.Collection("products").FindOne(r.Context(), bson.M{"_id": plan.ProductID}).Decode(&prod); err == nil {
					if prod.Category != "" {
						category = prod.Category
					}
				}
			}

			if _, ok := categoryMap[category]; !ok {
				categoryMap[category] = map[string]float64{"total": 0, "count": 0}
			}
			categoryMap[category]["total"] += plan.TotalAmount
			categoryMap[category]["count"]++
		}

		var results []map[string]interface{}
		for cat, vals := range categoryMap {
			results = append(results, map[string]interface{}{
				"category": cat, "total": vals["total"], "count": int(vals["count"]),
			})
		}
		if results == nil {
			results = []map[string]interface{}{}
		}
		respondJSON(w, http.StatusOK, results)
	}).Methods("GET")

	// Notifications
	protected.HandleFunc("/notifications/reminders", notificationH.TriggerReminders).Methods("POST")
	protected.HandleFunc("/notifications/send", notificationH.SendSingle).Methods("POST")

	// Receipts
	protected.HandleFunc("/receipts/print/{payment_id}", receiptH.PrintReceipt).Methods("POST")
	protected.HandleFunc("/receipts/download/{plan_id}", receiptH.DownloadReceipt).Methods("GET")

	// Dashboard
	protected.Handle("/dashboard/summary", middleware.DashboardCache.CacheResponse(http.HandlerFunc(dashboardH.Summary))).Methods("GET")
	protected.HandleFunc("/dashboard/overdue", dashboardH.OverdueDetails).Methods("GET")
	protected.HandleFunc("/dashboard/today-due", dashboardH.TodayDueDetails).Methods("GET")
	protected.HandleFunc("/dashboard/low-stock", dashboardH.LowStockDetails).Methods("GET")
	protected.HandleFunc("/dashboard/monthly-due", dashboardH.MonthlyDueDetails).Methods("GET")
	protected.HandleFunc("/dashboard/today-installments", dashboardH.TodayInstallments).Methods("GET")
	protected.HandleFunc("/dashboard/today-installment-stats", dashboardH.TodayInstallmentStats).Methods("GET")
	protected.HandleFunc("/dashboard/monthly-report", dashboardH.MonthlyReport).Methods("GET")
	protected.HandleFunc("/dashboard/overdue-installments", dashboardH.OverdueDetails).Methods("GET")
	protected.HandleFunc("/dashboard/active-installments", dashboardH.ActiveInstallments).Methods("GET")
	protected.HandleFunc("/dashboard/completed-installments", dashboardH.CompletedInstallments).Methods("GET")
	protected.HandleFunc("/dashboard/customers-with-finance", dashboardH.CustomersWithFinance).Methods("GET")
	protected.HandleFunc("/dashboard/today-due-full", dashboardH.TodayInstallments).Methods("GET")
	protected.HandleFunc("/dashboard/overdue-full", dashboardH.OverdueDetails).Methods("GET")

	// Reports
	reportH := NewReportHandler()
	protected.HandleFunc("/reports/daily", reportH.DailyReport).Methods("GET")
	protected.HandleFunc("/reports/weekly", reportH.WeeklyReport).Methods("GET")
	protected.HandleFunc("/reports/monthly", reportH.MonthlyReport).Methods("GET")
	protected.HandleFunc("/reports/date-range", reportH.DateRangeReport).Methods("GET")
	protected.HandleFunc("/reports/customers", reportH.CustomerReport).Methods("GET")

	// Sync endpoint
	protected.HandleFunc("/sync", func(w http.ResponseWriter, r *http.Request) {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"status": "ok", "pending": 0, "sync_status": "ready",
		})
	}).Methods("GET", "POST")

	// Expenses
	protected.HandleFunc("/expenses", expenseH.List).Methods("GET")
	protected.HandleFunc("/expenses", expenseH.Create).Methods("POST")
	protected.HandleFunc("/expenses/{id}", expenseH.GetByID).Methods("GET")
	protected.HandleFunc("/expenses/{id}", expenseH.Update).Methods("PUT")
	protected.HandleFunc("/expenses/{id}", expenseH.Delete).Methods("DELETE")

	// Installments plans list (for offline sync)
	protected.HandleFunc("/installments/plans", installmentH.ListAll).Methods("GET")

	// Payments list
	protected.HandleFunc("/payments/list", paymentH.ListAll).Methods("GET")

	// ========== PROMISES ==========
	protected.HandleFunc("/promises", promiseH.Create).Methods("POST")
	protected.HandleFunc("/promises", promiseH.ListAll).Methods("GET")
	protected.HandleFunc("/promises/pending", promiseH.ListPending).Methods("GET")
	protected.HandleFunc("/promises/today", promiseH.GetTodayPromises).Methods("GET")
	protected.HandleFunc("/promises/customer", promiseH.ListByCustomer).Methods("GET")
	protected.HandleFunc("/promises/status", promiseH.UpdateStatus).Methods("PUT")

	return r
}