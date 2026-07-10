package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/audit"
	"github.com/google/uuid"
)

type PromiseHandler struct{}

func NewPromiseHandler() *PromiseHandler {
	return &PromiseHandler{}
}

// CreatePromise creates a new payment promise
func (h *PromiseHandler) Create(w http.ResponseWriter, r *http.Request) {
	// Decode into raw map first to handle custom date formats
	var raw map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request body", "غلط درخواست")
		return
	}

	customerID, _ := raw["customer_id"].(string)
	planID, _ := raw["plan_id"].(string)

	if customerID == "" || planID == "" {
		respondError(w, r, http.StatusBadRequest, "Customer and Plan are required", "گاہک اور پلان ضروری ہیں")
		return
	}

	// Parse promise_date from various formats
	var promiseDate time.Time
	if pd, ok := raw["promise_date"].(string); ok && pd != "" {
		// Try common date formats
		formats := []string{
			"2006-01-02T15:04:05Z07:00",
			"2006-01-02T15:04:05",
			"2006-01-02",
			"02-01-2006",
			"2006/01/02",
		}
		for _, f := range formats {
			if t, err := time.Parse(f, pd); err == nil {
				promiseDate = t
				break
			}
		}
	}
	if promiseDate.IsZero() {
		promiseDate = time.Now().AddDate(0, 0, 7) // Default 7 days
	}

	installmentNo := 0
	if in, ok := raw["installment_no"].(float64); ok {
		installmentNo = int(in)
	}

	amount := 0.0
	if a, ok := raw["amount"].(float64); ok {
		amount = a
	}

	remarks, _ := raw["remarks"].(string)
	createdBy, _ := raw["created_by"].(string)

	p := domain.Promise{
		ID:            uuid.New().String(),
		CustomerID:    customerID,
		PlanID:        planID,
		InstallmentNo: installmentNo,
		PromiseDate:   promiseDate,
		Amount:        amount,
		Status:        "pending",
		Remarks:       remarks,
		CreatedBy:     createdBy,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	db := config.DB
	_, err := db.ExecContext(r.Context(), `
		INSERT INTO promises (id, customer_id, plan_id, installment_no, promise_date, amount, status, remarks, created_by, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, p.ID, p.CustomerID, p.PlanID, p.InstallmentNo, p.PromiseDate, p.Amount, p.Status, p.Remarks, p.CreatedBy, p.CreatedAt, p.UpdatedAt)

	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to create promise", "وعدہ نہیں بن سکا")
		return
	}

	audit.Log(r.Context(), "CREATE", "promise", p.ID, "", getUserID(r))
	respondJSON(w, http.StatusCreated, p)
}

// ListAll returns all promises (for offline sync)
func (h *PromiseHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	rows, err := db.QueryContext(r.Context(), `
		SELECT pr.id, pr.customer_id, pr.plan_id, pr.installment_no, pr.promise_date, pr.amount,
			pr.status, COALESCE(pr.remarks, ''), COALESCE(pr.created_by, ''),
			pr.created_at, pr.updated_at,
			COALESCE(c.name, ''), COALESCE(c.phone, ''), COALESCE(c.name_urdu, ''),
			COALESCE(prod.name, ''),
			pr.promise_date
		FROM promises pr
		LEFT JOIN customers c ON pr.customer_id = c.id
		LEFT JOIN installment_plans p ON pr.plan_id = p.id
		LEFT JOIN products prod ON p.product_id = prod.id
		ORDER BY pr.promise_date DESC
	`)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to list promises", "وعدے نہیں آسکے")
		return
	}
	defer rows.Close()

	var promises []domain.Promise
	for rows.Next() {
		var pr domain.Promise
		var dueDate time.Time
		rows.Scan(&pr.ID, &pr.CustomerID, &pr.PlanID, &pr.InstallmentNo, &pr.PromiseDate, &pr.Amount,
			&pr.Status, &pr.Remarks, &pr.CreatedBy, &pr.CreatedAt, &pr.UpdatedAt,
			&pr.CustomerName, &pr.CustomerPhone, &pr.CustomerNameUr, &pr.ProductName, &dueDate)
		pr.DueDate = dueDate
		promises = append(promises, pr)
	}
	if promises == nil {
		promises = []domain.Promise{}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"promises": promises,
		"total":    len(promises),
	})
}

// ListPending returns all pending promises
func (h *PromiseHandler) ListPending(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	rows, err := db.QueryContext(r.Context(), `
		SELECT pr.id, pr.customer_id, pr.plan_id, pr.installment_no, pr.promise_date, pr.amount,
			pr.status, COALESCE(pr.remarks, ''), COALESCE(pr.created_by, ''),
			pr.created_at, pr.updated_at,
			COALESCE(c.name, ''), COALESCE(c.phone, ''), COALESCE(c.name_urdu, ''),
			COALESCE(prod.name, ''),
			pr.promise_date
		FROM promises pr
		LEFT JOIN customers c ON pr.customer_id = c.id
		LEFT JOIN installment_plans p ON pr.plan_id = p.id
		LEFT JOIN products prod ON p.product_id = prod.id
		WHERE pr.status = 'pending'
		ORDER BY pr.promise_date ASC
	`)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to list promises", "وعدے نہیں آسکے")
		return
	}
	defer rows.Close()

	var promises []domain.Promise
	for rows.Next() {
		var pr domain.Promise
		var dueDate time.Time
		rows.Scan(&pr.ID, &pr.CustomerID, &pr.PlanID, &pr.InstallmentNo, &pr.PromiseDate, &pr.Amount,
			&pr.Status, &pr.Remarks, &pr.CreatedBy, &pr.CreatedAt, &pr.UpdatedAt,
			&pr.CustomerName, &pr.CustomerPhone, &pr.CustomerNameUr, &pr.ProductName, &dueDate)
		pr.DueDate = dueDate
		promises = append(promises, pr)
	}
	if promises == nil {
		promises = []domain.Promise{}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"promises": promises,
		"total":    len(promises),
	})
}

// ListByCustomer returns promises for a specific customer
func (h *PromiseHandler) ListByCustomer(w http.ResponseWriter, r *http.Request) {
	custID := r.URL.Query().Get("customer_id")
	if custID == "" {
		respondError(w, r, http.StatusBadRequest, "Customer ID required", "گاہک کی شناخت درکار ہے")
		return
	}

	db := config.DB
	rows, err := db.QueryContext(r.Context(), `
		SELECT id, customer_id, plan_id, installment_no, promise_date, amount,
			status, COALESCE(remarks, ''), COALESCE(created_by, ''),
			created_at, updated_at
		FROM promises WHERE customer_id = ?
		ORDER BY promise_date DESC
	`, custID)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to list promises", "وعدے نہیں آسکے")
		return
	}
	defer rows.Close()

	var promises []domain.Promise
	for rows.Next() {
		var pr domain.Promise
		rows.Scan(&pr.ID, &pr.CustomerID, &pr.PlanID, &pr.InstallmentNo, &pr.PromiseDate, &pr.Amount,
			&pr.Status, &pr.Remarks, &pr.CreatedBy, &pr.CreatedAt, &pr.UpdatedAt)
		promises = append(promises, pr)
	}
	if promises == nil {
		promises = []domain.Promise{}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"promises": promises,
		"total":    len(promises),
	})
}

// UpdateStatus updates a promise's status (fulfilled/broken)
func (h *PromiseHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request", "غلط درخواست")
		return
	}

	if payload.Status != "fulfilled" && payload.Status != "broken" {
		respondError(w, r, http.StatusBadRequest, "Status must be fulfilled or broken", "غلط سٹیٹس")
		return
	}

	db := config.DB
	_, err := db.ExecContext(r.Context(), "UPDATE promises SET status = ?, updated_at = ? WHERE id = ?",
		payload.Status, time.Now(), payload.ID)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to update promise", "وعدہ اپڈیٹ نہیں ہوا")
		return
	}

	audit.Log(r.Context(), "UPDATE", "promise", payload.ID, "", getUserID(r))
	respondJSON(w, http.StatusOK, map[string]string{"message": "Promise updated"})
}

// GetTodayPromises returns promises due today
func (h *PromiseHandler) GetTodayPromises(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	end := start.Add(24 * time.Hour)

	db := config.DB
	rows, err := db.QueryContext(r.Context(), `
		SELECT pr.id, pr.customer_id, pr.plan_id, pr.installment_no, pr.promise_date, pr.amount,
			pr.status, COALESCE(pr.remarks, ''), COALESCE(pr.created_by, ''),
			pr.created_at, pr.updated_at,
			COALESCE(c.name, ''), COALESCE(c.phone, ''), COALESCE(c.name_urdu, ''),
			COALESCE(prod.name, ''),
			pr.promise_date
		FROM promises pr
		LEFT JOIN customers c ON pr.customer_id = c.id
		LEFT JOIN installment_plans p ON pr.plan_id = p.id
		LEFT JOIN products prod ON p.product_id = prod.id
		WHERE pr.promise_date >= ? AND pr.promise_date < ? AND pr.status = 'pending'
		ORDER BY pr.promise_date ASC
	`, start, end)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to list today promises", "آج کے وعدے نہیں آسکے")
		return
	}
	defer rows.Close()

	var promises []domain.Promise
	for rows.Next() {
		var pr domain.Promise
		var dueDate time.Time
		rows.Scan(&pr.ID, &pr.CustomerID, &pr.PlanID, &pr.InstallmentNo, &pr.PromiseDate, &pr.Amount,
			&pr.Status, &pr.Remarks, &pr.CreatedBy, &pr.CreatedAt, &pr.UpdatedAt,
			&pr.CustomerName, &pr.CustomerPhone, &pr.CustomerNameUr, &pr.ProductName, &dueDate)
		pr.DueDate = dueDate
		promises = append(promises, pr)
	}
	if promises == nil {
		promises = []domain.Promise{}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"promises": promises,
		"total":    len(promises),
		"date":     now.Format("2006-01-02"),
	})
}

// DashboardStats returns dashboard collection summary stats
func (h *PromiseHandler) DashboardCollectionStats(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	var totalReceivable float64
	db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(COALESCE(d.amount,0)+COALESCE(d.fine,0)-COALESCE(d.partial_paid,0)), 0)
		FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id
		WHERE d.paid = 0 AND p.status IN ('active','overdue') AND d.due_date <= ?
	`, today.Add(24*time.Hour)).Scan(&totalReceivable)

	var collectedToday float64
	db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(amount), 0) FROM payments WHERE transaction_date >= ? AND transaction_date < ?
	`, today, today.Add(24*time.Hour)).Scan(&collectedToday)

	var totalCollected float64
	db.QueryRowContext(r.Context(), "SELECT COALESCE(SUM(amount), 0) FROM payments").Scan(&totalCollected)

	var todayDue float64
	db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(COALESCE(d.amount,0)+COALESCE(d.fine,0)-COALESCE(d.partial_paid,0)), 0)
		FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id
		WHERE d.paid = 0 AND p.status IN ('active','overdue')
		AND d.due_date >= ? AND d.due_date < ?
	`, today, today.Add(24*time.Hour)).Scan(&todayDue)

	var todayDueCount int
	db.QueryRowContext(r.Context(), `
		SELECT COUNT(*) FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id
		WHERE d.paid = 0 AND p.status IN ('active','overdue')
		AND d.due_date >= ? AND d.due_date < ?
	`, today, today.Add(24*time.Hour)).Scan(&todayDueCount)

	var overdueAmount float64
	db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(COALESCE(d.amount,0)+COALESCE(d.fine,0)-COALESCE(d.partial_paid,0)), 0)
		FROM installment_details d JOIN installment_plans p ON d.plan_id = p.id
		WHERE d.paid = 0 AND p.status IN ('active','overdue') AND d.due_date < ?
	`, today).Scan(&overdueAmount)

	var activePlansCount int
	db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM installment_plans WHERE status IN ('active','overdue')").Scan(&activePlansCount)

	var customerCount int
	db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM customers").Scan(&customerCount)

	var promisesCount int
	db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM promises WHERE status = 'pending'").Scan(&promisesCount)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"total_receivable":   totalReceivable,
		"collected_today":    collectedToday,
		"total_collected":    totalCollected,
		"today_due":          todayDue,
		"today_due_count":    todayDueCount,
		"overdue_amount":     overdueAmount,
		"active_plans_count": activePlansCount,
		"customer_count":     customerCount,
		"promises_count":     promisesCount,
	})
}