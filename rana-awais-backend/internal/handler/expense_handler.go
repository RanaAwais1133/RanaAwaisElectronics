package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/gorilla/mux"
)

// ═══════════════════════════════════════════════════════════════
// ✅ Expense Handler - CRUD operations for expenses
// ═══════════════════════════════════════════════════════════════

type ExpenseHandler struct{}

func NewExpenseHandler() *ExpenseHandler {
	return &ExpenseHandler{}
}

func (h *ExpenseHandler) List(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")
	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)
	if page < 1 { page = 1 }
	if limit < 1 || limit > 500 { limit = 100 }

	offset := (page - 1) * limit

	var totalCount int64
	db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM expenses").Scan(&totalCount)

	rows, err := db.QueryContext(r.Context(), `
		SELECT id, description, description_urdu, amount, category, date, paid_by, notes, created_at
		FROM expenses ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?
	`, limit, offset)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to fetch expenses", "اخراجات نہیں ملے")
		return
	}
	defer rows.Close()

	var expenses []map[string]interface{}
	for rows.Next() {
		var id, description, descriptionUrdu, category, paidBy, notes string
		var amount float64
		var date, createdAt time.Time
		rows.Scan(&id, &description, &descriptionUrdu, &amount, &category, &date, &paidBy, &notes, &createdAt)
		expenses = append(expenses, map[string]interface{}{
			"id":               id,
			"description":      description,
			"descriptionUrdu":  descriptionUrdu,
			"description_urdu": descriptionUrdu,
			"amount":           amount,
			"category":         category,
			"date":             date.Format("2006-01-02"),
			"paid_by":          paidBy,
			"paidBy":           paidBy,
			"notes":            notes,
			"created_at":       createdAt.Format(time.RFC3339),
		})
	}
	if expenses == nil {
		expenses = []map[string]interface{}{}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"data":  expenses,
		"total": totalCount,
		"page":  page,
		"limit": limit,
	})
}

func (h *ExpenseHandler) Create(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	var input struct {
		ID              string  `json:"id"`
		Description     string  `json:"description"`
		DescriptionUrdu string  `json:"descriptionUrdu"`
		Amount          float64 `json:"amount"`
		Category        string  `json:"category"`
		Date            string  `json:"date"`
		PaidBy          string  `json:"paid_by"`
		PaidByAlt       string  `json:"paidBy"`
		Notes           string  `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request body", "غلط ڈیٹا")
		return
	}

	if input.Description == "" {
		respondError(w, r, http.StatusBadRequest, "Description is required", "وضاحت ضروری ہے")
		return
	}
	if input.Amount <= 0 {
		respondError(w, r, http.StatusBadRequest, "Amount must be positive", "رقم مثبت ہونی چاہیے")
		return
	}

	if input.ID == "" {
		input.ID = generateID("EXP")
	}
	if input.Date == "" {
		input.Date = time.Now().Format("2006-01-02")
	}
	if input.Category == "" {
		input.Category = "general"
	}
	paidBy := input.PaidBy
	if paidBy == "" {
		paidBy = input.PaidByAlt
	}

	expenseDate, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		expenseDate = time.Now()
	}

	_, err = db.ExecContext(r.Context(), `
		INSERT INTO expenses (id, description, description_urdu, amount, category, date, paid_by, notes, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, input.ID, input.Description, input.DescriptionUrdu, input.Amount, input.Category, expenseDate, paidBy, input.Notes, time.Now())
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to create expense", "اخراج نہیں بنا")
		return
	}

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"success": true,
		"id":      input.ID,
		"message": "Expense created successfully",
	})
}

func (h *ExpenseHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	id := mux.Vars(r)["id"]

	var desc, descUrdu, category, paidBy, notes string
	var amount float64
	var date, createdAt time.Time

	err := db.QueryRowContext(r.Context(), `
		SELECT id, description, description_urdu, amount, category, date, paid_by, notes, created_at
		FROM expenses WHERE id = ?
	`, id).Scan(&id, &desc, &descUrdu, &amount, &category, &date, &paidBy, &notes, &createdAt)
	if err != nil {
		respondError(w, r, http.StatusNotFound, "Expense not found", "اخراج نہیں ملا")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"id":               id,
		"description":      desc,
		"descriptionUrdu":  descUrdu,
		"description_urdu": descUrdu,
		"amount":           amount,
		"category":         category,
		"date":             date.Format("2006-01-02"),
		"paid_by":          paidBy,
		"paidBy":           paidBy,
		"notes":            notes,
		"created_at":       createdAt.Format(time.RFC3339),
	})
}

func (h *ExpenseHandler) Update(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	id := mux.Vars(r)["id"]

	var input struct {
		Description     string  `json:"description"`
		DescriptionUrdu string  `json:"descriptionUrdu"`
		Amount          float64 `json:"amount"`
		Category        string  `json:"category"`
		Date            string  `json:"date"`
		PaidBy          string  `json:"paid_by"`
		PaidByAlt       string  `json:"paidBy"`
		Notes           string  `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request body", "غلط ڈیٹا")
		return
	}

	paidBy := input.PaidBy
	if paidBy == "" {
		paidBy = input.PaidByAlt
	}

	_, err := db.ExecContext(r.Context(), `
		UPDATE expenses SET description=?, description_urdu=?, amount=?, category=?, date=?, paid_by=?, notes=?
		WHERE id=?
	`, input.Description, input.DescriptionUrdu, input.Amount, input.Category, input.Date, paidBy, input.Notes, id)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to update expense", "اخراج اپ ڈیٹ نہیں ہوا")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Expense updated successfully",
	})
}

func (h *ExpenseHandler) Delete(w http.ResponseWriter, r *http.Request) {
	db := config.DB
	id := mux.Vars(r)["id"]

	_, err := db.ExecContext(r.Context(), "DELETE FROM expenses WHERE id = ?", id)
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to delete expense", "اخراج ڈیلیٹ نہیں ہوا")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Expense deleted successfully",
	})
}
