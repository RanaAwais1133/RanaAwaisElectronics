package handler

import (
	"database/sql"
	"net/http"
	"sync"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
)

type DashboardHandler struct{}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{}
}

func (h *DashboardHandler) Summary(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	ctx := r.Context()
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	todayEnd := todayStart.Add(24 * time.Hour)
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	monthEnd := monthStart.AddDate(0, 1, 0)

	type result struct {
		key   string
		value interface{}
	}

	var wg sync.WaitGroup
	results := make(chan result, 25)
	errChan := make(chan error, 25)

	// 1. Today's Collection (payments + down payments)
	wg.Add(1)
	go func() {
		defer wg.Done()
		var total float64
		var count int
		err := db.QueryRowContext(ctx, `SELECT COALESCE(SUM(amount), 0), COUNT(*) FROM payments WHERE transaction_date >= ? AND transaction_date < ?`, todayStart, todayEnd).Scan(&total, &count)
		if err != nil {
			errChan <- err
			return
		}
		// Also include down payments from installment_plans created today
		var downPaymentTotal float64
		var downPaymentCount int
		db.QueryRowContext(ctx, `SELECT COALESCE(SUM(down_payment), 0), COUNT(*) FROM installment_plans WHERE created_at >= ? AND created_at < ? AND down_payment > 0`, todayStart, todayEnd).Scan(&downPaymentTotal, &downPaymentCount)
		total += downPaymentTotal
		count += downPaymentCount
		results <- result{"todayCollection", map[string]interface{}{"total": total, "count": count}}
	}()

	// 2 & 3. Today Revenue & Profit (Profit Percentage Based)
	wg.Add(1)
	go func() {
		defer wg.Done()
		var revenue, profit float64
		db.QueryRowContext(ctx, `SELECT COALESCE(SUM(amount), 0) FROM payments WHERE transaction_date >= ? AND transaction_date < ?`, todayStart, todayEnd).Scan(&revenue)
		var downPaymentRevenue float64
		db.QueryRowContext(ctx, `SELECT COALESCE(SUM(down_payment), 0) FROM installment_plans WHERE created_at >= ? AND created_at < ?`, todayStart, todayEnd).Scan(&downPaymentRevenue)
		revenue += downPaymentRevenue
		
		// Profit = Payment × (1 - PurchasePrice/SellingPrice) per plan
		var profitFromPayments float64
		db.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(pay.amount * (1.0 - COALESCE(prod.purchase_price, 0) / NULLIF(p.total_amount, 0))), 0)
			FROM payments pay
			JOIN installment_plans p ON pay.installment_plan_id = p.id
			LEFT JOIN products prod ON p.product_id = prod.id
			WHERE pay.transaction_date >= ? AND pay.transaction_date < ?
		`, todayStart, todayEnd).Scan(&profitFromPayments)
		
		var profitFromDownPayments float64
		db.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(ip.down_payment * (1.0 - COALESCE(prod.purchase_price, 0) / NULLIF(ip.total_amount, 0))), 0)
			FROM installment_plans ip
			LEFT JOIN products prod ON ip.product_id = prod.id
			WHERE ip.created_at >= ? AND ip.created_at < ? AND ip.down_payment > 0
		`, todayStart, todayEnd).Scan(&profitFromDownPayments)
		
		profit = profitFromPayments + profitFromDownPayments
		
		// Subtract expenses (rent, electricity, etc.)
		var expenseFromEntries float64
		db.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(amount), 0) FROM accounting_entries 
			WHERE type = 'expense' AND date >= ? AND date < ?
		`, todayStart, todayEnd).Scan(&expenseFromEntries)
		profit -= expenseFromEntries
		
		results <- result{"todayRevenue", revenue}
		results <- result{"todayProfit", profit}
	}()


	// 4 & 5. Month Revenue & Profit (Profit Percentage Based)
	wg.Add(1)
	go func() {
		defer wg.Done()
		var revenue, profit float64
		db.QueryRowContext(ctx, `SELECT COALESCE(SUM(amount), 0) FROM payments WHERE transaction_date >= ? AND transaction_date < ?`, monthStart, monthEnd).Scan(&revenue)
		var downPaymentRevenue float64
		db.QueryRowContext(ctx, `SELECT COALESCE(SUM(down_payment), 0) FROM installment_plans WHERE created_at >= ? AND created_at < ?`, monthStart, monthEnd).Scan(&downPaymentRevenue)
		revenue += downPaymentRevenue
		
		// Profit = Payment × (1 - PurchasePrice/SellingPrice) per plan
		var profitFromPayments float64
		db.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(pay.amount * (1.0 - COALESCE(prod.purchase_price, 0) / NULLIF(p.total_amount, 0))), 0)
			FROM payments pay
			JOIN installment_plans p ON pay.installment_plan_id = p.id
			LEFT JOIN products prod ON p.product_id = prod.id
			WHERE pay.transaction_date >= ? AND pay.transaction_date < ?
		`, monthStart, monthEnd).Scan(&profitFromPayments)
		
		var profitFromDownPayments float64
		db.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(ip.down_payment * (1.0 - COALESCE(prod.purchase_price, 0) / NULLIF(ip.total_amount, 0))), 0)
			FROM installment_plans ip
			LEFT JOIN products prod ON ip.product_id = prod.id
			WHERE ip.created_at >= ? AND ip.created_at < ? AND ip.down_payment > 0
		`, monthStart, monthEnd).Scan(&profitFromDownPayments)
		
		profit = profitFromPayments + profitFromDownPayments
		
		// Subtract expenses (rent, electricity, etc.)
		var expenseFromEntries float64
		db.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(amount), 0) FROM accounting_entries 
			WHERE type = 'expense' AND date >= ? AND date < ?
		`, monthStart, monthEnd).Scan(&expenseFromEntries)
		profit -= expenseFromEntries
		
		results <- result{"monthRevenue", revenue}
		results <- result{"monthProfit", profit}
	}()


	// 6. Total Pending (amount)
	wg.Add(1)
	go func() {
		defer wg.Done()
		var total float64
		db.QueryRowContext(ctx, `SELECT COALESCE(SUM(COALESCE(d.amount, 0) + COALESCE(d.fine, 0) - COALESCE(d.partial_paid, 0)), 0) FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id WHERE d.paid = 0 AND p.status = 'active'`).Scan(&total)
		results <- result{"totalPending", total}
	}()

	// 6b. Pending Customers Count
	wg.Add(1)
	go func() {
		defer wg.Done()
		var count int64
		db.QueryRowContext(ctx, `SELECT COUNT(DISTINCT p.customer_id) FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id WHERE d.paid = 0 AND p.status = 'active'`).Scan(&count)
		results <- result{"pendingCustomers", count}
	}()

	// 6c. Pending Total Amount (for frontend)
	wg.Add(1)
	go func() {
		defer wg.Done()
		var total float64
		db.QueryRowContext(ctx, `SELECT COALESCE(SUM(COALESCE(d.amount, 0) + COALESCE(d.fine, 0) - COALESCE(d.partial_paid, 0)), 0) FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id WHERE d.paid = 0 AND p.status = 'active'`).Scan(&total)
		results <- result{"pendingTotal", total}
	}()

	// 7. Total Paid
	wg.Add(1)
	go func() {
		defer wg.Done()
		var total float64
		db.QueryRowContext(ctx, "SELECT COALESCE(SUM(amount), 0) FROM payments").Scan(&total)
		results <- result{"totalPaid", total}
	}()

	// 8. Total Customers
	wg.Add(1)
	go func() {
		defer wg.Done()
		var count int64
		db.QueryRowContext(ctx, "SELECT COUNT(*) FROM customers").Scan(&count)
		results <- result{"totalCustomers", count}
	}()

	// 9. Active Installments
	wg.Add(1)
	go func() {
		defer wg.Done()
		var count int64
		db.QueryRowContext(ctx, "SELECT COUNT(*) FROM installment_plans WHERE status = 'active'").Scan(&count)
		results <- result{"activeInstallments", count}
	}()

	// 10. Completed Installments
	wg.Add(1)
	go func() {
		defer wg.Done()
		var count int64
		db.QueryRowContext(ctx, "SELECT COUNT(*) FROM installment_plans WHERE status = 'completed'").Scan(&count)
		results <- result{"completedInstallments", count}
	}()

	// 11. Total Products
	wg.Add(1)
	go func() {
		defer wg.Done()
		var count int64
		db.QueryRowContext(ctx, "SELECT COUNT(*) FROM products").Scan(&count)
		results <- result{"totalProducts", count}
	}()

	// 12. Low Stock Items
	wg.Add(1)
	go func() {
		defer wg.Done()
		var count int64
		db.QueryRowContext(ctx, "SELECT COUNT(*) FROM products WHERE in_stock = 1 AND stock_count <= 5").Scan(&count)
		results <- result{"lowStock", count}
	}()

	// 13. Inventory Value (only in_stock items, using purchase_price * quantity)
	wg.Add(1)
	go func() {
		defer wg.Done()
		var value float64
		db.QueryRowContext(ctx, "SELECT COALESCE(SUM(COALESCE(purchase_price, 0) * COALESCE(quantity, 1)), 0) FROM inventory_items WHERE status = 'in_stock'").Scan(&value)
		results <- result{"inventoryValue", value}
	}()

	// 14. Ageing Inventory
	wg.Add(1)
	go func() {
		defer wg.Done()
		var count int64
		cutoff := now.AddDate(0, 0, -90)
		db.QueryRowContext(ctx, "SELECT COUNT(*) FROM inventory_items WHERE created_at <= ? AND status = 'in_stock'", cutoff).Scan(&count)
		results <- result{"ageingInventory", count}
	}()

	// 15. Overdue Installments count
	wg.Add(1)
	go func() {
		defer wg.Done()
		var count int64
		db.QueryRowContext(ctx, `SELECT COUNT(*) FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id WHERE d.paid = 0 AND p.status = 'active' AND d.due_date < ?`, todayStart).Scan(&count)
		results <- result{"overdueCount", count}
	}()

	// 16. Today Due count
	wg.Add(1)
	go func() {
		defer wg.Done()
		var count int64
		db.QueryRowContext(ctx, `SELECT COUNT(*) FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id WHERE d.paid = 0 AND p.status = 'active' AND d.due_date >= ? AND d.due_date < ?`, todayStart, todayEnd).Scan(&count)
		results <- result{"todayDueCount", count}
	}()

	// 17. Monthly Due count
	wg.Add(1)
	go func() {
		defer wg.Done()
		var count int64
		db.QueryRowContext(ctx, `SELECT COUNT(*) FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id WHERE d.paid = 0 AND p.status = 'active' AND d.due_date >= ? AND d.due_date < ?`, monthStart, monthEnd).Scan(&count)
		results <- result{"monthlyDueCount", count}
	}()

	go func() { wg.Wait(); close(results) }()

	summary := make(map[string]interface{})
	fields := []string{"todayCollection", "todayRevenue", "todayProfit", "monthRevenue", "monthProfit",
		"totalPending", "pendingCustomers", "pendingTotal", "totalPaid", "totalCustomers", "activeInstallments", "completedInstallments",
		"totalProducts", "lowStock", "inventoryValue", "ageingInventory", "overdueCount", "todayDueCount", "monthlyDueCount"}
	for _, f := range fields {
		switch f {
		case "todayCollection":
			summary[f] = map[string]interface{}{"total": 0.0, "count": 0}
		case "todayRevenue", "todayProfit", "totalPending", "pendingTotal", "totalPaid", "inventoryValue":
			summary[f] = 0.0
		default:
			summary[f] = int64(0)
		}
	}
	for res := range results {
		summary[res.key] = res.value
	}

	respondJSON(w, http.StatusOK, summary)
}

func (h *DashboardHandler) TodayInstallments(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	end := start.Add(24 * time.Hour)

	rows, err := db.QueryContext(r.Context(), `
		SELECT p.id, c.name, COALESCE(c.name_urdu, ''), COALESCE(c.father_name, ''), COALESCE(c.phone, ''),
			COALESCE(prod.name, ''), COALESCE(prod.name_urdu, ''), d.installment_no, d.due_date, d.amount,
			d.paid, d.partial_paid, d.paid_date, d.remaining, COALESCE(d.collected_by, ''),
			p.total_amount, p.down_payment, p.remaining_amount, p.num_installments
		FROM installment_details d
		JOIN installment_plans p ON d.plan_id = p.id
		LEFT JOIN customers c ON p.customer_id = c.id
		LEFT JOIN products prod ON p.product_id = prod.id
		WHERE d.paid = 0 AND p.status = 'active' AND d.due_date >= ? AND d.due_date < ?
		ORDER BY d.due_date
	`, start, end)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch", "ناکام")
		return
	}
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		var planID, name, nameUrdu, father, phone, prodName, prodNameUrdu, cBy string
		var instNo int
		var dueDate time.Time
		var amount, partialPaid, remaining, totalAmt, downPayment, remainingAmt float64
		var paid bool
		var paidDate sql.NullTime
		var numInst int
		rows.Scan(&planID, &name, &nameUrdu, &father, &phone, &prodName, &prodNameUrdu,
			&instNo, &dueDate, &amount, &paid, &partialPaid, &paidDate, &remaining, &cBy,
			&totalAmt, &downPayment, &remainingAmt, &numInst)
		item := map[string]interface{}{
			"id": planID, "customer_name": name, "customer_urdu": nameUrdu, "father_name": father,
			"phone": phone, "product_name": prodName, "product_name_urdu": prodNameUrdu,
			"installment_no": instNo, "due_date": dueDate.Format("2006-01-02"), "amount": amount,
			"paid": paid, "partial_paid": partialPaid, "remaining": remaining,
			"collected_by": cBy, "total_amount": totalAmt, "down_payment": downPayment,
			"remaining_amount": remainingAmt, "num_installments": numInst,
		}
		if paidDate.Valid { item["paid_date"] = paidDate.Time.Format("2006-01-02") }
		result = append(result, item)
	}
	if result == nil { result = []map[string]interface{}{} }
	respondJSON(w, http.StatusOK, result)
}

func (h *DashboardHandler) OverdueDetails(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	rows, err := db.QueryContext(r.Context(), `
		SELECT p.id, c.name, COALESCE(c.name_urdu, ''), COALESCE(c.father_name, ''), COALESCE(c.phone, ''),
			COALESCE(prod.name, ''), COALESCE(prod.name_urdu, ''), d.installment_no, d.due_date, d.amount,
			d.paid, d.partial_paid, d.remaining, COALESCE(d.collected_by, ''), d.fine,
			p.total_amount, p.remaining_amount
		FROM installment_details d
		JOIN installment_plans p ON d.plan_id = p.id
		LEFT JOIN customers c ON p.customer_id = c.id
		LEFT JOIN products prod ON p.product_id = prod.id
		WHERE d.paid = 0 AND p.status = 'active' AND d.due_date < ?
		ORDER BY d.due_date
	`, today)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch overdue", "ناکام")
		return
	}
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		var planID, name, nameUrdu, father, phone, prodName, prodNameUrdu, cBy string
		var instNo int
		var dueDate time.Time
		var amount, partialPaid, remaining, fine, totalAmt, remainingAmt float64
		var paid bool
		rows.Scan(&planID, &name, &nameUrdu, &father, &phone, &prodName, &prodNameUrdu,
			&instNo, &dueDate, &amount, &paid, &partialPaid, &remaining, &cBy, &fine,
			&totalAmt, &remainingAmt)
		result = append(result, map[string]interface{}{
			"id": planID, "customer_name": name, "customer_urdu": nameUrdu, "father_name": father,
			"phone": phone, "product_name": prodName, "product_name_urdu": prodNameUrdu,
			"installment_no": instNo, "due_date": dueDate.Format("2006-01-02"), "amount": amount,
			"paid": paid, "partial_paid": partialPaid, "remaining": remaining,
			"collected_by": cBy, "fine": fine, "total_amount": totalAmt, "remaining_amount": remainingAmt,
		})
	}
	if result == nil { result = []map[string]interface{}{} }
	respondJSON(w, http.StatusOK, result)
}

func (h *DashboardHandler) TodayDueDetails(w http.ResponseWriter, r *http.Request) {
	h.TodayInstallments(w, r)
}

func (h *DashboardHandler) LowStockDetails(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	rows, err := db.QueryContext(r.Context(), `SELECT id, name, name_urdu, stock_count, price, purchase_price FROM products WHERE in_stock = 1 AND stock_count <= 5 ORDER BY stock_count LIMIT 50`)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch", "ناکام")
		return
	}
	defer rows.Close()
	var result []map[string]interface{}
	for rows.Next() {
		var id, name, nameUrdu string
		var stock int; var price, pp float64
		rows.Scan(&id, &name, &nameUrdu, &stock, &price, &pp)
		result = append(result, map[string]interface{}{"id": id, "name": name, "name_urdu": nameUrdu, "stock_count": stock, "price": price, "purchase_price": pp})
	}
	if result == nil { result = []map[string]interface{}{} }
	respondJSON(w, http.StatusOK, result)
}

func (h *DashboardHandler) MonthlyDueDetails(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	end := start.AddDate(0, 1, 0)

	rows, err := db.QueryContext(r.Context(), `
		SELECT p.id, c.name, COALESCE(c.name_urdu, ''), COALESCE(c.father_name, ''), COALESCE(c.phone, ''),
			COALESCE(prod.name, ''), COALESCE(prod.name_urdu, ''), d.installment_no, d.due_date, d.amount,
			d.paid, d.partial_paid, d.remaining, p.total_amount
		FROM installment_details d
		JOIN installment_plans p ON d.plan_id = p.id
		LEFT JOIN customers c ON p.customer_id = c.id
		LEFT JOIN products prod ON p.product_id = prod.id
		WHERE d.paid = 0 AND p.status = 'active' AND d.due_date >= ? AND d.due_date < ?
		ORDER BY d.due_date
	`, start, end)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch", "ناکام")
		return
	}
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		var planID, name, nameUrdu, father, phone, prodName, prodNameUrdu string
		var instNo int
		var dueDate time.Time
		var amount, partialPaid, remaining, totalAmt float64
		var paid bool
		rows.Scan(&planID, &name, &nameUrdu, &father, &phone, &prodName, &prodNameUrdu,
			&instNo, &dueDate, &amount, &paid, &partialPaid, &remaining, &totalAmt)
		result = append(result, map[string]interface{}{
			"id": planID, "customer_name": name, "customer_urdu": nameUrdu, "father_name": father,
			"phone": phone, "product_name": prodName, "product_name_urdu": prodNameUrdu,
			"installment_no": instNo, "due_date": dueDate.Format("2006-01-02"), "amount": amount,
			"paid": paid, "partial_paid": partialPaid, "remaining": remaining, "total_amount": totalAmt,
		})
	}
	if result == nil { result = []map[string]interface{}{} }
	respondJSON(w, http.StatusOK, result)
}

func (h *DashboardHandler) ActiveInstallments(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	rows, err := db.QueryContext(r.Context(), `
		SELECT p.id, c.name, COALESCE(c.name_urdu, ''), COALESCE(c.father_name, ''), COALESCE(c.phone, ''),
			COALESCE(prod.name, ''), COALESCE(prod.name_urdu, ''), p.total_amount, p.down_payment,
			p.remaining_amount, p.num_installments, p.start_date, p.end_date, p.status, p.created_by, p.created_at
		FROM installment_plans p
		LEFT JOIN customers c ON p.customer_id = c.id
		LEFT JOIN products prod ON p.product_id = prod.id
		WHERE p.status = 'active'
		ORDER BY p.created_at DESC
	`)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch", "ناکام")
		return
	}
	defer rows.Close()
	var result []map[string]interface{}
	for rows.Next() {
		var planID, name, nameUrdu, father, phone, prodName, prodNameUrdu, status, createdBy string
		var totalAmt, downPayment, remainingAmt float64
		var numInst int
		var startDate, endDate, createdAt time.Time
		rows.Scan(&planID, &name, &nameUrdu, &father, &phone, &prodName, &prodNameUrdu,
			&totalAmt, &downPayment, &remainingAmt, &numInst, &startDate, &endDate, &status, &createdBy, &createdAt)
		
		// Calculate paid amount = down_payment + sum of all payments for this plan
		var paidAmount float64
		var paidCount int
		db.QueryRowContext(r.Context(), `SELECT COALESCE(SUM(amount), 0), COUNT(*) FROM payments WHERE installment_plan_id = ?`, planID).Scan(&paidAmount, &paidCount)
		paidAmount += downPayment // Include down payment in total paid
		
		result = append(result, map[string]interface{}{
			"id": planID, "customer_name": name, "customer_urdu": nameUrdu, "father_name": father,
			"phone": phone, "product_name": prodName, "product_name_urdu": prodNameUrdu,
			"total_amount": totalAmt, "down_payment": downPayment, "remaining_amount": remainingAmt,
			"num_installments": numInst, "paid_amount": paidAmount, "paid_count": paidCount,
			"start_date": startDate.Format("2006-01-02"),
			"end_date": endDate.Format("2006-01-02"), "status": status, "created_by": createdBy,
		})
	}
	if result == nil { result = []map[string]interface{}{} }
	respondJSON(w, http.StatusOK, result)
}
func (h *DashboardHandler) CompletedInstallments(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	rows, err := db.QueryContext(r.Context(), `
		SELECT p.id, c.name, COALESCE(c.name_urdu, ''), COALESCE(c.father_name, ''), COALESCE(c.phone, ''),
			COALESCE(prod.name, ''), COALESCE(prod.name_urdu, ''), p.total_amount, p.down_payment,
			p.remaining_amount, p.num_installments, p.start_date, p.end_date, p.status, p.created_by, p.created_at
		FROM installment_plans p
		LEFT JOIN customers c ON p.customer_id = c.id
		LEFT JOIN products prod ON p.product_id = prod.id
		WHERE p.status = 'completed'
		ORDER BY p.updated_at DESC
	`)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch", "ناکام")
		return
	}
	defer rows.Close()
	var result []map[string]interface{}
	for rows.Next() {
		var planID, name, nameUrdu, father, phone, prodName, prodNameUrdu, status, createdBy string
		var totalAmt, downPayment, remainingAmt float64
		var numInst int
		var startDate, endDate, createdAt time.Time
		rows.Scan(&planID, &name, &nameUrdu, &father, &phone, &prodName, &prodNameUrdu,
			&totalAmt, &downPayment, &remainingAmt, &numInst, &startDate, &endDate, &status, &createdBy, &createdAt)
		
		// Calculate paid amount = down_payment + sum of all payments for this plan
		var paidAmount float64
		var paidCount int
		db.QueryRowContext(r.Context(), `SELECT COALESCE(SUM(amount), 0), COUNT(*) FROM payments WHERE installment_plan_id = ?`, planID).Scan(&paidAmount, &paidCount)
		paidAmount += downPayment // Include down payment in total paid
		
		result = append(result, map[string]interface{}{
			"id": planID, "customer_name": name, "customer_urdu": nameUrdu, "father_name": father,
			"phone": phone, "product_name": prodName, "product_name_urdu": prodNameUrdu,
			"total_amount": totalAmt, "down_payment": downPayment, "remaining_amount": remainingAmt,
			"num_installments": numInst, "paid_amount": paidAmount, "paid_count": paidCount,
			"start_date": startDate.Format("2006-01-02"),
			"end_date": endDate.Format("2006-01-02"), "status": status, "created_by": createdBy,
		})
	}
	if result == nil { result = []map[string]interface{}{} }
	respondJSON(w, http.StatusOK, result)
}

// TodayInstallmentStats returns today's installment collection stats

func (h *DashboardHandler) TodayInstallmentStats(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	tomorrow := today.Add(24 * time.Hour)

	var totalDueCount int
	var totalDueAmount float64
	db.QueryRowContext(r.Context(), `
		SELECT COUNT(*), COALESCE(SUM(COALESCE(d.amount,0)+COALESCE(d.fine,0)-COALESCE(d.partial_paid,0)), 0)
		FROM installment_details d
		JOIN installment_plans p ON d.plan_id = p.id
		WHERE d.paid = 0 AND p.status IN ('active','overdue')
		AND d.due_date >= ? AND d.due_date < ?
	`, today, tomorrow).Scan(&totalDueCount, &totalDueAmount)

	var collectedCount int
	var collectedAmount float64
	db.QueryRowContext(r.Context(), `
		SELECT COUNT(*), COALESCE(SUM(amount), 0)
		FROM payments
		WHERE transaction_date >= ? AND transaction_date < ?
	`, today, tomorrow).Scan(&collectedCount, &collectedAmount)

	remainingCount := totalDueCount - collectedCount
	remainingAmount := totalDueAmount - collectedAmount
	if remainingCount < 0 { remainingCount = 0 }
	if remainingAmount < 0 { remainingAmount = 0 }

	collectedRows, err := db.QueryContext(r.Context(), `
		SELECT c.id, c.name, COALESCE(c.name_urdu, ''), COALESCE(c.father_name, ''), COALESCE(c.phone, ''),
			COALESCE(c.address, ''), COALESCE(c.address_urdu, ''), pay.amount, pay.installment_no, pay.transaction_date,
			COALESCE(prod.name, ''), pay.installment_plan_id
		FROM payments pay
		JOIN installment_plans p ON pay.installment_plan_id = p.id
		JOIN customers c ON p.customer_id = c.id
		LEFT JOIN products prod ON p.product_id = prod.id
		WHERE pay.transaction_date >= ? AND pay.transaction_date < ?
		ORDER BY pay.transaction_date
	`, today, tomorrow)
	var collectedCustomers []map[string]interface{}
	if err == nil {
		defer collectedRows.Close()
		for collectedRows.Next() {
			var cid, name, nameUrdu, father, phone, addr, addrUrdu, prodName, planID string
			var amount float64
			var instNo int
			var txnDate time.Time
			collectedRows.Scan(&cid, &name, &nameUrdu, &father, &phone, &addr, &addrUrdu, &amount, &instNo, &txnDate, &prodName, &planID)
			collectedCustomers = append(collectedCustomers, map[string]interface{}{
				"customer_id": cid, "customer_name": name, "customer_name_urdu": nameUrdu,
				"father_name": father, "phone": phone, "address": addr, "address_urdu": addrUrdu,
				"amount": amount, "installment_no": instNo, "date": txnDate.Format("2006-01-02"),
				"product_name": prodName, "plan_id": planID,
			})
		}
	}
	if collectedCustomers == nil { collectedCustomers = []map[string]interface{}{} }

	remainingRows, err := db.QueryContext(r.Context(), `
		SELECT c.id, c.name, COALESCE(c.name_urdu, ''), COALESCE(c.father_name, ''), COALESCE(c.phone, ''),
			COALESCE(c.address, ''), COALESCE(c.address_urdu, ''), d.amount, d.installment_no, d.due_date,
			COALESCE(prod.name, ''), d.plan_id
		FROM installment_details d
		JOIN installment_plans p ON d.plan_id = p.id
		JOIN customers c ON p.customer_id = c.id
		LEFT JOIN products prod ON p.product_id = prod.id
		WHERE d.paid = 0 AND p.status IN ('active','overdue')
		AND d.due_date >= ? AND d.due_date < ?
		ORDER BY d.due_date
	`, today, tomorrow)
	var remainingCustomers []map[string]interface{}
	if err == nil {
		defer remainingRows.Close()
		for remainingRows.Next() {
			var cid, name, nameUrdu, father, phone, addr, addrUrdu, prodName, planID string
			var amount float64
			var instNo int
			var dueDate time.Time
			remainingRows.Scan(&cid, &name, &nameUrdu, &father, &phone, &addr, &addrUrdu, &amount, &instNo, &dueDate, &prodName, &planID)
			remainingCustomers = append(remainingCustomers, map[string]interface{}{
				"customer_id": cid, "customer_name": name, "customer_name_urdu": nameUrdu,
				"father_name": father, "phone": phone, "address": addr, "address_urdu": addrUrdu,
				"amount": amount, "installment_no": instNo, "due_date": dueDate.Format("2006-01-02"),
				"product_name": prodName, "plan_id": planID,
			})
		}
	}
	if remainingCustomers == nil { remainingCustomers = []map[string]interface{}{} }

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"total_due_count":     totalDueCount,
		"total_due_amount":    totalDueAmount,
		"collected_count":     collectedCount,
		"collected_amount":    collectedAmount,
		"remaining_count":     remainingCount,
		"remaining_amount":    remainingAmount,
		"collected_customers": collectedCustomers,
		"remaining_customers": remainingCustomers,
	})
}

func (h *DashboardHandler) CustomersWithFinance(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	rows, err := db.QueryContext(r.Context(), `
		SELECT c.id, c.name, COALESCE(c.name_urdu, ''), COALESCE(c.father_name, ''), COALESCE(c.phone, ''),
			COALESCE(c.cnic, ''), COALESCE(c.address, ''), COALESCE(c.address_urdu, ''),
			COUNT(p.id) as total_plans,
			COALESCE(SUM(p.total_amount), 0) as total_purchase,
			COALESCE(SUM(CASE WHEN p.status = 'active' THEN p.remaining_amount ELSE 0 END), 0) as total_outstanding,
			COALESCE(SUM((SELECT COALESCE(SUM(pay.amount), 0) FROM payments pay WHERE pay.installment_plan_id = p.id)), 0) as total_paid,
			c.created_at
		FROM customers c
		LEFT JOIN installment_plans p ON c.id = p.customer_id
		GROUP BY c.id
		ORDER BY total_outstanding DESC
	`)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch", "ناکام")
		return
	}
	defer rows.Close()
	var result []map[string]interface{}
	for rows.Next() {
		var id, name, nameUrdu, father, phone, cnic, addr, addrUrdu string
		var totalPlans int
		var totalPurchase, totalOutstanding, totalPaid float64
		var createdAt time.Time
		rows.Scan(&id, &name, &nameUrdu, &father, &phone, &cnic, &addr, &addrUrdu, &totalPlans, &totalPurchase, &totalOutstanding, &totalPaid, &createdAt)
		result = append(result, map[string]interface{}{
			"id": id, "name": name, "name_urdu": nameUrdu, "father_name": father, "phone": phone,
			"cnic": cnic, "address": addr, "address_urdu": addrUrdu,
			"total_plans": totalPlans, "total_purchase": totalPurchase,
			"total_outstanding": totalOutstanding, "total_paid": totalPaid,
			"created_at": createdAt.Format("2006-01-02"),
		})
	}
	if result == nil { result = []map[string]interface{}{} }
	respondJSON(w, http.StatusOK, result)
}
