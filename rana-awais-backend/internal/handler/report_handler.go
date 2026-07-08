package handler

import (
	"net/http"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
)

type ReportHandler struct{}

func NewReportHandler() *ReportHandler {
	return &ReportHandler{}
}

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

	// Get payments for this date
	rows, err := db.QueryContext(r.Context(), `
		SELECT pay.id, c.name, COALESCE(c.name_urdu, ''), COALESCE(c.father_name, ''), COALESCE(c.phone, ''),
			COALESCE(c.cnic, ''), COALESCE(c.address, ''), COALESCE(c.address_urdu, ''),
			COALESCE(prod.name, ''), COALESCE(prod.name_urdu, ''), pay.amount, 
			pay.method, pay.transaction_date, pay.installment_no, COALESCE(pay.collected_by, ''),
			pay.installment_plan_id
		FROM payments pay
		JOIN installment_plans p ON pay.installment_plan_id = p.id
		JOIN customers c ON p.customer_id = c.id
		LEFT JOIN products prod ON p.product_id = prod.id
		WHERE pay.transaction_date >= ? AND pay.transaction_date < ?
		ORDER BY pay.transaction_date
	`, startOfDay, endOfDay)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch report", "رپورٹ نہیں آئی")
		return
	}
	defer rows.Close()

	var cashTotal, bankTotal float64
	var transactions []map[string]interface{}
	for rows.Next() {
		var pid, name, nameUrdu, father, phone, cnic, addr, addrUrdu, prodName, prodNameUrdu, method, cBy, planID string
		var amount float64
		var txnDate time.Time
		var instNo int
		rows.Scan(&pid, &name, &nameUrdu, &father, &phone, &cnic, &addr, &addrUrdu,
			&prodName, &prodNameUrdu, &amount, &method, &txnDate, &instNo, &cBy, &planID)

		item := map[string]interface{}{
			"id": pid, "customer_name": name, "customer_urdu": nameUrdu, "father_name": father,
			"phone": phone, "cnic": cnic, "address": addr, "address_urdu": addrUrdu,
			"product_name": prodName, "product_name_urdu": prodNameUrdu,
			"amount": amount, "method": method, "status": "paid",
			"date": txnDate.Format("2006-01-02"), "installment_no": instNo,
			"collected_by": cBy, "plan_id": planID,
		}
		transactions = append(transactions, item)

		if method == "bank" { bankTotal += amount } else { cashTotal += amount }
	}
	if transactions == nil { transactions = []map[string]interface{}{} }

	// Get total customers
	var totalCustomers int
	db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM customers").Scan(&totalCustomers)

	// Get pending amount for today
	var pendingAmount float64
	db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(COALESCE(d.amount,0)+COALESCE(d.fine,0)-COALESCE(d.partial_paid,0)), 0)
		FROM installment_details d
		JOIN installment_plans p ON d.plan_id = p.id
		WHERE d.paid = 0 AND p.status = 'active' AND d.due_date >= ? AND d.due_date < ?
	`, startOfDay, endOfDay).Scan(&pendingAmount)

	// Get recovery rate (paid / total active payments)
	var totalCollected, recoveryRate float64
	if len(transactions) > 0 {
		db.QueryRowContext(r.Context(), `SELECT COALESCE(SUM(amount), 0) FROM payments WHERE transaction_date >= ? AND transaction_date < ?`, startOfDay, endOfDay).Scan(&totalCollected)
		var totalRemaining float64
		db.QueryRowContext(r.Context(), `SELECT COALESCE(SUM(COALESCE(d.amount,0)+COALESCE(d.fine,0)-COALESCE(d.partial_paid,0)), 0) FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id WHERE d.paid = 0 AND p.status = 'active'`).Scan(&totalRemaining)
		if totalRemaining > 0 {
			recoveryRate = (totalCollected / (totalCollected + totalRemaining)) * 100
		}
	}

	// Get total installment count for this period
	var totalInstallments int
	db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id WHERE d.due_date >= ? AND d.due_date < ?`, startOfDay, endOfDay).Scan(&totalInstallments)

	// Get open/closed accounts and outstanding totals
	var openAccounts, closedAccounts int
	var totalOutstanding float64
	db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM installment_plans WHERE status IN ('active','overdue')").Scan(&openAccounts)
	db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM installment_plans WHERE status = 'completed'").Scan(&closedAccounts)
	db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(COALESCE(d.amount,0)+COALESCE(d.fine,0)-COALESCE(d.partial_paid,0)), 0)
		FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id
		WHERE d.paid = 0 AND p.status IN ('active','overdue')
	`).Scan(&totalOutstanding)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"date":               dateStr,
		"total_sales":        cashTotal + bankTotal,
		"total_pending":      pendingAmount,
		"total_collected":    totalCollected,
		"total_installments": totalInstallments,
		"customers":          totalCustomers,
		"cash_in_hand":       cashTotal,
		"bank_deposit":       bankTotal,
		"transactions":       transactions,
		"recoveryRate":       recoveryRate,
		"open_accounts":      openAccounts,
		"closed_accounts":    closedAccounts,
		"net_accounts":       openAccounts + closedAccounts,
		"total_outstanding":  totalOutstanding,
		"cash_in_hand_amount": cashTotal,
		"bank_deposit_amount": bankTotal,
	})
}

func (h *ReportHandler) WeeklyReport(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	today := now.Truncate(24 * time.Hour)
	weekday := now.Weekday()
	daysSinceMonday := int(weekday) - 1
	if daysSinceMonday < 0 { daysSinceMonday = 6 }
	monday := today.AddDate(0, 0, -daysSinceMonday)
	sunday := monday.AddDate(0, 0, 7)

	h.getRangeReport(w, r, monday, sunday, "weekly")
}

func (h *ReportHandler) MonthlyReport(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	monthEnd := monthStart.AddDate(0, 1, 0)
	h.getRangeReport(w, r, monthStart, monthEnd, "monthly")
}

func (h *ReportHandler) DateRangeReport(w http.ResponseWriter, r *http.Request) {
	start, end, err := parseDateRange(r)
	if err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid date range", "غلط تاریخ کی حد")
		return
	}
	h.getRangeReport(w, r, start, end, "date-range")
}

func (h *ReportHandler) getRangeReport(w http.ResponseWriter, r *http.Request, start, end time.Time, reportType string) {
	db := config.DB

	rows, err := db.QueryContext(r.Context(), `
		SELECT pay.id, c.name, COALESCE(c.name_urdu, ''), COALESCE(c.father_name, ''), COALESCE(c.phone, ''),
			COALESCE(c.cnic, ''), COALESCE(c.address, ''), COALESCE(c.address_urdu, ''),
			COALESCE(prod.name, ''), COALESCE(prod.name_urdu, ''), pay.amount, COALESCE(pay.fine_paid, 0),
			pay.method, pay.transaction_date, pay.installment_no, COALESCE(pay.collected_by, ''),
			pay.installment_plan_id
		FROM payments pay
		JOIN installment_plans p ON pay.installment_plan_id = p.id
		JOIN customers c ON p.customer_id = c.id
		LEFT JOIN products prod ON p.product_id = prod.id
		WHERE pay.transaction_date >= ? AND pay.transaction_date < ?
		ORDER BY pay.transaction_date
	`, start, end)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch report", "رپورٹ نہیں آئی")
		return
	}
	defer rows.Close()

	var cashTotal, bankTotal float64
	var transactions []map[string]interface{}
	for rows.Next() {
		var pid, name, nameUrdu, father, phone, cnic, addr, addrUrdu, prodName, prodNameUrdu, method, cBy, planID string
		var amount, finePaid float64
		var txnDate time.Time
		var instNo int
		rows.Scan(&pid, &name, &nameUrdu, &father, &phone, &cnic, &addr, &addrUrdu,
			&prodName, &prodNameUrdu, &amount, &finePaid, &method, &txnDate, &instNo, &cBy, &planID)
		item := map[string]interface{}{
			"id": pid, "customer_name": name, "customer_urdu": nameUrdu, "father_name": father,
			"phone": phone, "cnic": cnic, "address": addr, "address_urdu": addrUrdu,
			"product_name": prodName, "product_name_urdu": prodNameUrdu,
			"amount": amount, "fine_paid": finePaid, "method": method, "status": "paid",
			"date": txnDate.Format("2006-01-02"), "installment_no": instNo,
			"collected_by": cBy, "plan_id": planID,
		}
		transactions = append(transactions, item)
		if method == "bank" { bankTotal += amount } else { cashTotal += amount }
	}
	if transactions == nil { transactions = []map[string]interface{}{} }

	var totalCustomers int
	db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM customers").Scan(&totalCustomers)

	var totalPending float64
	db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(COALESCE(d.amount,0)+COALESCE(d.fine,0)-COALESCE(d.partial_paid,0)), 0)
		FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id
		WHERE d.paid = 0 AND p.status = 'active'
	`).Scan(&totalPending)

	// Get open/closed accounts and outstanding totals
	var openAccounts, closedAccounts int
	var totalOutstanding float64
	db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM installment_plans WHERE status IN ('active','overdue')").Scan(&openAccounts)
	db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM installment_plans WHERE status = 'completed'").Scan(&closedAccounts)
	db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(COALESCE(d.amount,0)+COALESCE(d.fine,0)-COALESCE(d.partial_paid,0)), 0)
		FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id
		WHERE d.paid = 0 AND p.status IN ('active','overdue')
	`).Scan(&totalOutstanding)

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

func (h *ReportHandler) CustomerReport(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	rows, err := db.QueryContext(r.Context(), `
		SELECT c.id, c.name, COALESCE(c.name_urdu, ''), COALESCE(c.phone, ''),
			COALESCE(c.cnic, ''), COALESCE(c.address, ''), COALESCE(c.address_urdu, ''),
			COUNT(p.id) as total_plans,
			SUM(CASE WHEN p.status = 'active' THEN 1 ELSE 0 END) as active_plans,
			SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completed_plans,
			COALESCE(SUM(p.total_amount), 0) as total_purchase,
			COALESCE(SUM(CASE WHEN p.status = 'active' THEN p.remaining_amount ELSE 0 END), 0) as total_outstanding,
			c.created_at
		FROM customers c
		LEFT JOIN installment_plans p ON c.id = p.customer_id
		GROUP BY c.id
		ORDER BY total_outstanding DESC
	`)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to generate customer report", "گاہک رپورٹ نہیں بن سکی")
		return
	}
	defer rows.Close()

	var customers []map[string]interface{}
	for rows.Next() {
		var id, name, nameUrdu, phone, cnic, addr, addrUrdu string
		var totalPlans, activePlans, completedPlans int
		var totalPurchase, totalOutstanding float64
		var createdAt time.Time
		rows.Scan(&id, &name, &nameUrdu, &phone, &cnic, &addr, &addrUrdu,
			&totalPlans, &activePlans, &completedPlans, &totalPurchase, &totalOutstanding, &createdAt)
		customers = append(customers, map[string]interface{}{
			"id": id, "name": name, "name_urdu": nameUrdu, "phone": phone, "cnic": cnic,
			"address": addr, "address_urdu": addrUrdu,
			"total_plans": totalPlans, "active_plans": activePlans, "completed_plans": completedPlans,
			"total_purchase": totalPurchase, "total_outstanding": totalOutstanding,
			"created_at": createdAt.Format("2006-01-02"),
		})
	}
	if customers == nil { customers = []map[string]interface{}{} }

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"customers": customers,
		"total":     len(customers),
	})
}