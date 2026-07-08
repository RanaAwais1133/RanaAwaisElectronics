package handler

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/middleware"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
	"github.com/gorilla/mux"
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
	syncH *SyncHandler,
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
	adminH := NewAdminHandler(userSvc)
	reportH := NewReportHandler()
	dashboardH := NewDashboardHandler()
	promiseH := NewPromiseHandler()
	expenseH := NewExpenseHandler()

	api := r.PathPrefix("/api").Subrouter()

	// ========== PUBLIC ROUTES ==========
	api.HandleFunc("/health", HealthCheck).Methods("GET")
	api.HandleFunc("/auth/login", authH.Login).Methods("POST")
	api.HandleFunc("/license/validate", adminH.ValidateLicenseAPI).Methods("POST")
	api.HandleFunc("/license/status", adminH.GetLicenseStatus).Methods("GET")
	api.HandleFunc("/auth/debug", authH.LoginDebug).Methods("POST")

	// ========== PROTECTED ROUTES ==========
	protected := api.NewRoute().Subrouter()
	protected.Use(middleware.AuthMiddleware(cfg))

	// Admin-only routes (backup, users, settings)
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

	// Password change - support both POST and PUT for frontend compatibility
	protected.HandleFunc("/auth/change-password", userH.ChangePassword).Methods("POST", "PUT")

	// Audit logs
	protected.HandleFunc("/audit-logs", func(w http.ResponseWriter, r *http.Request) {
		db := config.DB
		pageStr := r.URL.Query().Get("page")
		limitStr := r.URL.Query().Get("limit")
		page, _ := strconv.Atoi(pageStr)
		limit, _ := strconv.Atoi(limitStr)
		if page < 1 { page = 1 }
		if limit < 1 || limit > 100 { limit = 50 }

		var totalCount int64
		db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM audit_logs").Scan(&totalCount)

		offset := int64((page - 1) * limit)
		rows, err := db.QueryContext(r.Context(), `
			SELECT a.id, a.action, a.entity, a.entity_id, a.user_id, a.timestamp, a.details, COALESCE(NULLIF(u.display_name, ''), u.username, '') as user_name
			FROM audit_logs a
			LEFT JOIN users u ON a.user_id = u.id
			ORDER BY a.timestamp DESC
			LIMIT ? OFFSET ?
		`, limit, offset)
		if err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to load logs", "لاگز لوڈ نہیں ہوئے")
			return
		}
		defer rows.Close()

		var logs []map[string]interface{}
		for rows.Next() {
			var id int
			var action, entity, entityID, userID, details, userName string
			var timestamp time.Time
			rows.Scan(&id, &action, &entity, &entityID, &userID, &timestamp, &details, &userName)
			logs = append(logs, map[string]interface{}{
				"_id": id, "action": action, "entity": entity, "entity_id": entityID,
				"user_id": userID, "timestamp": timestamp, "details": details, "user_name": userName,
			})
		}
		if logs == nil { logs = []map[string]interface{}{} }

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"logs": logs, "total": totalCount, "page": page, "limit": limit,
		})
	}).Methods("GET")

	// Customers
	protected.HandleFunc("/customers", customerH.List).Methods("GET")
	protected.HandleFunc("/customers", customerH.Create).Methods("POST")
	protected.HandleFunc("/customers/search", customerH.Search).Methods("GET")
	protected.HandleFunc("/customers/{id}", customerH.GetByID).Methods("GET")
	protected.HandleFunc("/customers/{id}", customerH.Update).Methods("PUT")
	protected.HandleFunc("/customers/{id}", customerH.Delete).Methods("DELETE")
	protected.HandleFunc("/customers/{id}/history", func(w http.ResponseWriter, r *http.Request) {
		id := mux.Vars(r)["id"]
		db := config.DB

		// Get customer details
		cust, err := customerH.svc.GetByID(r.Context(), id)
		if err != nil || cust == nil {
			respondError(w, r, http.StatusNotFound, "Customer not found", "گاہک نہیں ملا")
			return
		}

		// Get all plans for this customer
		planRows, err := db.QueryContext(r.Context(), `
			SELECT p.id, p.total_amount, p.down_payment, p.remaining_amount, p.num_installments,
				p.status, p.created_at, p.completed_date, p.completed_by,
				COALESCE(prod.name, ''), COALESCE(prod.name_urdu, '')
			FROM installment_plans p
			LEFT JOIN products prod ON p.product_id = prod.id
			WHERE p.customer_id = ?
			ORDER BY p.created_at DESC
		`, id)
		var plans []map[string]interface{}
		if err == nil {
			defer planRows.Close()
			for planRows.Next() {
				var planID, status, prodName, prodNameUrdu, completedBy string
				var totalAmt, downPayment, remaining float64
				var numInst int
				var createdAt, completedDate sql.NullTime
				planRows.Scan(&planID, &totalAmt, &downPayment, &remaining, &numInst,
					&status, &createdAt, &completedDate, &completedBy, &prodName, &prodNameUrdu)

				// Get payments for this plan
				payRows, _ := db.QueryContext(r.Context(), `
					SELECT amount, method, transaction_date, remarks FROM payments
					WHERE installment_plan_id = ? ORDER BY transaction_date DESC
				`, planID)
				var payments []map[string]interface{}
				if payRows != nil {
					for payRows.Next() {
						var pAmt float64; var pMethod, pRemarks string; var pDate time.Time
						payRows.Scan(&pAmt, &pMethod, &pDate, &pRemarks)
						payments = append(payments, map[string]interface{}{
							"amount": pAmt, "method": pMethod,
							"date": pDate.Format("2006-01-02"), "remarks": pRemarks,
						})
					}
					payRows.Close()
				}
				if payments == nil { payments = []map[string]interface{}{} }

				// Get promises for this plan
				promRows, _ := db.QueryContext(r.Context(), `
					SELECT promise_date, amount, status, remarks FROM promises
					WHERE plan_id = ? ORDER BY promise_date DESC
				`, planID)
				var promises []map[string]interface{}
				if promRows != nil {
					for promRows.Next() {
						var promDate time.Time; var promAmt float64; var promStatus, promRemarks string
						promRows.Scan(&promDate, &promAmt, &promStatus, &promRemarks)
						promises = append(promises, map[string]interface{}{
							"date": promDate.Format("2006-01-02"), "amount": promAmt,
							"status": promStatus, "remarks": promRemarks,
						})
					}
					promRows.Close()
				}
				if promises == nil { promises = []map[string]interface{}{} }

				plan := map[string]interface{}{
					"id": planID, "product_name": prodName, "product_name_urdu": prodNameUrdu,
					"total_amount": totalAmt, "down_payment": downPayment, "remaining_amount": remaining,
					"num_installments": numInst, "status": status,
					"created_at": "", "completed_date": "", "completed_by": completedBy,
					"payments": payments, "promises": promises,
				}
				if createdAt.Valid { plan["created_at"] = createdAt.Time.Format("2006-01-02") }
				if completedDate.Valid { plan["completed_date"] = completedDate.Time.Format("2006-01-02") }
				plans = append(plans, plan)
			}
		}
		if plans == nil { plans = []map[string]interface{}{} }

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"customer": cust,
			"plans":    plans,
		})
	}).Methods("GET")

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

	// Payments (aliases for frontend compatibility)
	protected.HandleFunc("/payments", installmentH.RecordPayment).Methods("POST")
	protected.HandleFunc("/payments/advance", installmentH.AdvancePayment).Methods("POST")
	protected.HandleFunc("/payments/bulk", installmentH.BulkPayment).Methods("POST")

	// Upcoming installments
	protected.HandleFunc("/installments/upcoming", func(w http.ResponseWriter, r *http.Request) {
		daysStr := r.URL.Query().Get("days")
		days, err := strconv.Atoi(daysStr)
		if err != nil || days <= 0 { days = 1 }

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

		db := config.DB
		rows, err := db.QueryContext(r.Context(), `
			SELECT p.id, c.name, COALESCE(c.name_urdu, ''), COALESCE(c.father_name, ''), COALESCE(c.phone, ''),
				COALESCE(c.cnic, ''), COALESCE(c.address, ''), COALESCE(c.address_urdu, ''),
				COALESCE(prod.name, ''), d.installment_no, d.due_date, d.amount, d.paid, d.partial_paid,
				d.paid_date, p.num_installments
			FROM installment_details d
			JOIN installment_plans p ON d.plan_id = p.id
			LEFT JOIN customers c ON p.customer_id = c.id
			LEFT JOIN products prod ON p.product_id = prod.id
			WHERE p.status IN ('active', 'Open') AND d.paid = 0
				AND d.due_date >= ? AND d.due_date < ?
			ORDER BY d.due_date
		`, start, end)
		if err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to fetch upcoming", "ناکام")
			return
		}
		defer rows.Close()
		var result []map[string]interface{}
		for rows.Next() {
			var id, name, nameUrdu, fatherName, phone, cnic, address, addressUrdu, productName string
			var instNo int
			var dueDate time.Time
			var amount, partialPaid float64
			var paid bool
			var paidDate sql.NullTime
			var numInst int

			rows.Scan(&id, &name, &nameUrdu, &fatherName, &phone, &cnic, &address, &addressUrdu,
				&productName, &instNo, &dueDate, &amount, &paid, &partialPaid, &paidDate, &numInst)

			item := map[string]interface{}{
				"id": id, "customer_name": name, "customer_urdu": nameUrdu,
				"father_name": fatherName, "phone": phone, "cnic": cnic,
				"address": address, "address_urdu": addressUrdu, "product_name": productName,
				"installment_no": instNo, "due_date": dueDate.Format("2006-01-02"),
				"amount": amount, "paid": paid, "partial_paid": partialPaid,
				"total_installments": numInst,
			}
			if paidDate.Valid {
				item["paid_date"] = paidDate.Time.Format("2006-01-02")
			}
			result = append(result, item)
		}
		if result == nil { result = []map[string]interface{}{} }
		respondJSON(w, http.StatusOK, result)
	}).Methods("GET")

	// Detailed report (MUST be before /{id} routes to avoid conflict)
	protected.HandleFunc("/installments/detailed-report", func(w http.ResponseWriter, r *http.Request) {
		daysStr := r.URL.Query().Get("days")
		days, err := strconv.Atoi(daysStr)
		if err != nil || days <= 0 { days = 1 }
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

		db := config.DB
		planRows, err := db.QueryContext(r.Context(), `
			SELECT DISTINCT p.id, c.name, COALESCE(c.name_urdu, ''), COALESCE(c.father_name, ''),
				COALESCE(c.phone, ''), COALESCE(c.cnic, ''), COALESCE(c.address, ''), COALESCE(c.address_urdu, ''),
				COALESCE(prod.name, ''), COALESCE(prod.name_urdu, ''), p.total_amount, p.down_payment,
				p.remaining_amount, p.num_installments, p.created_at, p.created_by
			FROM installment_plans p
			JOIN customers c ON p.customer_id = c.id
			LEFT JOIN products prod ON p.product_id = prod.id
			WHERE p.status = 'active' AND EXISTS (
				SELECT 1 FROM installment_details d WHERE d.plan_id = p.id AND d.paid = 0
				AND d.due_date >= ? AND d.due_date < ?
			)
		`, start, end)
		if err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to fetch detailed report", "ناکام")
			return
		}
		defer planRows.Close()

		var result []map[string]interface{}
		for planRows.Next() {
			var planID, name, nameUrdu, fatherName, phone, cnic, address, addressUrdu, prodName, prodNameUrdu, createdBy string
			var totalAmt, downPayment, remaining float64
			var numInst int
			var createdAt time.Time
			planRows.Scan(&planID, &name, &nameUrdu, &fatherName, &phone, &cnic, &address, &addressUrdu,
				&prodName, &prodNameUrdu, &totalAmt, &downPayment, &remaining, &numInst, &createdAt, &createdBy)

			detailRows, _ := db.QueryContext(r.Context(), `
				SELECT d.installment_no, d.due_date, d.amount, d.paid, d.paid_date, d.partial_paid, d.remaining,
					COALESCE(d.collected_by, ''), COALESCE(d.collected_by_id, '')
				FROM installment_details d WHERE d.plan_id = ? AND d.due_date >= ? AND d.due_date < ?
				ORDER BY d.installment_no`, planID, start, end)
			var installments []map[string]interface{}
			if detailRows != nil {
				for detailRows.Next() {
					var dNo int; var dDue time.Time; var dAmt, dPartial, dRemaining float64
					var dPaid bool; var dPaidDate sql.NullTime; var dCB, dCBI string
					detailRows.Scan(&dNo, &dDue, &dAmt, &dPaid, &dPaidDate, &dPartial, &dRemaining, &dCB, &dCBI)
					item := map[string]interface{}{
						"installment_no": dNo, "due_date": dDue.Format("2006-01-02"), "amount": dAmt,
						"paid": dPaid, "partial_paid": dPartial, "remaining": dRemaining,
						"collected_by": dCB, "collected_by_id": dCBI,
					}
					if dPaidDate.Valid { item["paid_date"] = dPaidDate.Time.Format("2006-01-02") }
					installments = append(installments, item)
				}
				detailRows.Close()
			}
			if installments == nil { installments = []map[string]interface{}{} }

			payRows, _ := db.QueryContext(r.Context(), "SELECT id, amount, method, transaction_date FROM payments WHERE installment_plan_id = ? ORDER BY transaction_date", planID)
			var payments []map[string]interface{}
			if payRows != nil {
				for payRows.Next() {
					var pID, pMethod string; var pAmt float64; var pDate time.Time
					payRows.Scan(&pID, &pAmt, &pMethod, &pDate)
					payments = append(payments, map[string]interface{}{"id": pID, "amount": pAmt, "method": pMethod, "transaction_date": pDate})
				}
				payRows.Close()
			}
			if payments == nil { payments = []map[string]interface{}{} }

			guarRows, _ := db.QueryContext(r.Context(), "SELECT id, name, phone FROM guarantors WHERE customer_id = (SELECT customer_id FROM installment_plans WHERE id = ?)", planID)
			var guarantors []map[string]interface{}
			if guarRows != nil {
				for guarRows.Next() {
					var gID, gName, gPhone string
					guarRows.Scan(&gID, &gName, &gPhone)
					guarantors = append(guarantors, map[string]interface{}{"id": gID, "name": gName, "phone": gPhone})
				}
				guarRows.Close()
			}
			if guarantors == nil { guarantors = []map[string]interface{}{} }

			result = append(result, map[string]interface{}{
				"id": planID, "customer_name": name, "customer_urdu": nameUrdu,
				"father_name": fatherName, "phone": phone, "cnic": cnic, "address": address, "address_urdu": addressUrdu,
				"product_name": prodName, "product_name_urdu": prodNameUrdu,
				"total_amount": totalAmt, "down_payment": downPayment, "remaining_amount": remaining,
				"num_installments": numInst, "installments": installments,
				"payments": payments, "guarantors": guarantors,
				"created_at": createdAt.Format("2006-01-02"), "created_by": createdBy,
			})
		}
		if result == nil { result = []map[string]interface{}{} }
		respondJSON(w, http.StatusOK, result)
	}).Methods("GET")

	protected.HandleFunc("/installments/{id}", installmentH.GetByID).Methods("GET")
	protected.HandleFunc("/installments/{id}", installmentH.Delete).Methods("DELETE")

	// Payments
	protected.HandleFunc("/payments/plan/{plan_id}", paymentH.ListByPlan).Methods("GET")

	// Accounting
	protected.HandleFunc("/accounting/today", accountingH.TodaySummary).Methods("GET")
	protected.HandleFunc("/accounting/month", accountingH.MonthSummary).Methods("GET")
	protected.HandleFunc("/accounting/profit-loss/cash", accountingH.ProfitLossCashFlow).Methods("GET")
	protected.HandleFunc("/accounting/profit-loss/accrual", accountingH.ProfitLossAccrual).Methods("GET")

	// Pending total
	protected.HandleFunc("/accounting/pending-total", func(w http.ResponseWriter, r *http.Request) {
		db := config.DB

		var pendingTotal float64
		db.QueryRowContext(r.Context(), `
			SELECT COALESCE(SUM(COALESCE(d.amount,0) + COALESCE(d.fine,0) - COALESCE(d.partial_paid,0)), 0)
			FROM installment_details d
			JOIN installment_plans p ON d.plan_id = p.id
			WHERE d.paid = 0 AND p.status = 'active'
		`).Scan(&pendingTotal)

		custRows, err := db.QueryContext(r.Context(), `
			SELECT p.customer_id, c.name, COALESCE(c.name_urdu, ''), COALESCE(c.father_name, ''),
				COALESCE(c.phone, ''), COALESCE(c.cnic, ''), COALESCE(c.address, ''), COALESCE(c.address_urdu, ''),
				SUM(COALESCE(d.amount,0) + COALESCE(d.fine,0) - COALESCE(d.partial_paid,0)) as pending,
				COUNT(*) as count,
				MIN(d.due_date) as earliest
			FROM installment_details d
			JOIN installment_plans p ON d.plan_id = p.id
			JOIN customers c ON p.customer_id = c.id
			WHERE d.paid = 0 AND p.status = 'active'
			GROUP BY p.customer_id
			ORDER BY pending DESC
		`)
		var customers []map[string]interface{}
		if err == nil {
			defer custRows.Close()
			for custRows.Next() {
				var cid, name, nameUrdu, fatherName, phone, cnic, addr, addrUrdu string
				var pending float64
				var count int
				var earliest time.Time
				custRows.Scan(&cid, &name, &nameUrdu, &fatherName, &phone, &cnic, &addr, &addrUrdu, &pending, &count, &earliest)
				customers = append(customers, map[string]interface{}{
					"customer_id": cid, "customer_name": name, "customer_name_urdu": nameUrdu,
					"father_name": fatherName, "phone": phone, "cnic": cnic,
					"address": addr, "address_urdu": addrUrdu,
					"pending_amount": pending, "installment_count": count,
					"earliest_due_date": earliest.Format("2006-01-02"),
				})
			}
		}
		if customers == nil { customers = []map[string]interface{}{} }

		respondJSON(w, http.StatusOK, map[string]interface{}{"pending_total": pendingTotal, "customers": customers})
	}).Methods("GET")

	// Total paid
	protected.HandleFunc("/accounting/total-paid", func(w http.ResponseWriter, r *http.Request) {
		db := config.DB
		var totalPaid float64
		db.QueryRowContext(r.Context(), "SELECT COALESCE(SUM(amount), 0) FROM payments").Scan(&totalPaid)

		custRows, err := db.QueryContext(r.Context(), `
			SELECT p.customer_id, c.name, COALESCE(c.name_urdu, ''), COALESCE(c.father_name, ''),
				COALESCE(c.phone, ''), SUM(pay.amount) as paid, COUNT(*) as cnt
			FROM payments pay
			JOIN installment_plans p ON pay.installment_plan_id = p.id
			JOIN customers c ON p.customer_id = c.id
			GROUP BY p.customer_id
			ORDER BY paid DESC
		`)
		var customers []map[string]interface{}
		if err == nil {
			defer custRows.Close()
			for custRows.Next() {
				var cid, name, nameUrdu, fatherName, phone string
				var paid float64; var cnt int
				custRows.Scan(&cid, &name, &nameUrdu, &fatherName, &phone, &paid, &cnt)
				customers = append(customers, map[string]interface{}{
					"customer_id": cid, "customer_name": name, "customer_name_urdu": nameUrdu,
					"father_name": fatherName, "phone": phone, "paid_amount": paid, "payment_count": cnt,
				})
			}
		}
		if customers == nil { customers = []map[string]interface{}{} }
		respondJSON(w, http.StatusOK, map[string]interface{}{"total_paid": totalPaid, "customers": customers})
	}).Methods("GET")

	// Accounting summary & product-wise
	protected.HandleFunc("/accounting/summary", func(w http.ResponseWriter, r *http.Request) {
		start, end, err := parseDateRange(r)
		if err != nil {
			respondError(w, r, http.StatusBadRequest, "Invalid date range", "غلط تاریخ کی حد")
			return
		}
		basis := r.URL.Query().Get("basis")
		if basis == "" { basis = "cash_flow" }

		db := config.DB
		rows, err := db.QueryContext(r.Context(), `SELECT type, SUM(amount) FROM accounting_entries WHERE basis = ? AND date >= ? AND date <= ? GROUP BY type`, basis, start, end)
		if err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to aggregate", "ناکام")
			return
		}
		defer rows.Close()
		var income, expense float64
		for rows.Next() {
			var t string; var total float64
			rows.Scan(&t, &total)
			if t == "income" { income = total } else { expense = total }
		}
		respondJSON(w, http.StatusOK, map[string]interface{}{"total_income": income, "total_expense": expense, "net_profit": income - expense})
	}).Methods("GET")

	protected.HandleFunc("/accounting/product-wise", func(w http.ResponseWriter, r *http.Request) {
		db := config.DB
		rows, err := db.QueryContext(r.Context(), `
			SELECT COALESCE(prod.category, 'Uncategorized'), SUM(p.total_amount), COUNT(*)
			FROM installment_plans p
			LEFT JOIN products prod ON p.product_id = prod.id
			WHERE p.status = 'active'
			GROUP BY prod.category
			ORDER BY SUM(p.total_amount) DESC
		`)
		if err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to aggregate", "ڈیٹا حاصل کرنے میں ناکامی")
			return
		}
		defer rows.Close()
		var results []map[string]interface{}
		for rows.Next() {
			var cat string; var total float64; var cnt int
			rows.Scan(&cat, &total, &cnt)
			results = append(results, map[string]interface{}{"category": cat, "total": total, "count": cnt})
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
	protected.HandleFunc("/dashboard/overdue-installments", dashboardH.OverdueDetails).Methods("GET")
	protected.HandleFunc("/dashboard/active-installments", dashboardH.ActiveInstallments).Methods("GET")
	protected.HandleFunc("/dashboard/completed-installments", dashboardH.CompletedInstallments).Methods("GET")
	protected.HandleFunc("/dashboard/customers-with-finance", dashboardH.CustomersWithFinance).Methods("GET")
	// Full detail endpoints for offline sync (aliases for frontend compatibility)
	protected.HandleFunc("/dashboard/today-due-full", dashboardH.TodayInstallments).Methods("GET")
	protected.HandleFunc("/dashboard/overdue-full", dashboardH.OverdueDetails).Methods("GET")

	// Sync endpoint for offline data
	protected.HandleFunc("/sync", func(w http.ResponseWriter, r *http.Request) {
		db := config.DB
		var deviceID string
		r.ParseForm()
		deviceID = r.FormValue("device_id")
		if deviceID == "" {
			deviceID = "unknown"
		}

		var pendingCount int
		db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM sync_logs WHERE status = 'pending'").Scan(&pendingCount)

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"status":      "ok",
			"pending":     pendingCount,
			"device_id":   deviceID,
			"sync_status": "ready",
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

	// Payments list (for offline sync)
	protected.HandleFunc("/payments/list", paymentH.ListAll).Methods("GET")

	// Sync status & management
	protected.HandleFunc("/sync/status", syncH.GetSyncStatus).Methods("GET")
	protected.HandleFunc("/sync/force", syncH.ForceSync).Methods("POST")
	protected.HandleFunc("/sync/pending", syncH.GetPendingSyncRecords).Methods("GET")

	// Reports
	protected.HandleFunc("/reports/customers", reportH.CustomerReport).Methods("GET")
	protected.HandleFunc("/reports/daily", reportH.DailyReport).Methods("GET")
	protected.HandleFunc("/reports/weekly", reportH.WeeklyReport).Methods("GET")
	protected.HandleFunc("/reports/monthly", reportH.MonthlyReport).Methods("GET")
	protected.HandleFunc("/reports/date-range", reportH.DateRangeReport).Methods("GET")

	// Promises
	protected.HandleFunc("/promises", promiseH.ListAll).Methods("GET")
	protected.HandleFunc("/promises", promiseH.Create).Methods("POST")
	protected.HandleFunc("/promises/pending", promiseH.ListPending).Methods("GET")
	protected.HandleFunc("/promises/today", promiseH.GetTodayPromises).Methods("GET")
	protected.HandleFunc("/promises/customer", promiseH.ListByCustomer).Methods("GET")
	protected.HandleFunc("/promises/status", promiseH.UpdateStatus).Methods("PUT")
	protected.HandleFunc("/dashboard/collection-stats", promiseH.DashboardCollectionStats).Methods("GET")
	protected.HandleFunc("/dashboard/today-installment-stats", dashboardH.TodayInstallmentStats).Methods("GET")

	return r
}

func HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}