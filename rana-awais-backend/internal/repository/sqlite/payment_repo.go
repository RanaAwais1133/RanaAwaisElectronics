package sqlite

import (
	"context"
	"database/sql"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/google/uuid"
)

type PaymentRepository struct {
	db *sql.DB
}

func NewPaymentRepository(db *sql.DB) *PaymentRepository {
	return &PaymentRepository{db: db}
}

func (r *PaymentRepository) Create(ctx context.Context, p *domain.Payment) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	p.CreatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO payments (id, installment_plan_id, installment_no, amount, amount_without_fine, fine_paid,
			method, receipt_number, transaction_date, payment_date, collected_by, collected_by_id,
			recovery_officer, remarks, is_full_payment, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.ID, p.InstallmentPlanID, p.InstallmentNo, p.Amount, p.AmountWithoutFine, p.FinePaid,
		p.Method, p.ReceiptNumber, p.TransactionDate, p.PaymentDate, p.CollectedBy, p.CollectedById,
		p.RecoveryOfficer, p.Remarks, boolToInt(p.IsFullPayment), p.CreatedAt)
	return err
}

func (r *PaymentRepository) GetByID(ctx context.Context, id string) (*domain.Payment, error) {
	p := &domain.Payment{}
	var receiptNumber, collectedBy, collectedById, recoveryOfficer, remarks sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, installment_plan_id, installment_no, amount, amount_without_fine, fine_paid,
			method, receipt_number, transaction_date, payment_date, collected_by, collected_by_id,
			recovery_officer, remarks, is_full_payment, created_at
		FROM payments WHERE id = ?`, id).Scan(
		&p.ID, &p.InstallmentPlanID, &p.InstallmentNo, &p.Amount, &p.AmountWithoutFine, &p.FinePaid,
		&p.Method, &receiptNumber, &p.TransactionDate, &p.PaymentDate, &collectedBy, &collectedById,
		&recoveryOfficer, &remarks, &p.IsFullPayment, &p.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	p.ReceiptNumber = receiptNumber.String
	p.CollectedBy = collectedBy.String
	p.CollectedById = collectedById.String
	p.RecoveryOfficer = recoveryOfficer.String
	p.Remarks = remarks.String
	return p, nil
}

func (r *PaymentRepository) ListByPlan(ctx context.Context, planID string) ([]domain.Payment, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, installment_plan_id, installment_no, amount, amount_without_fine, fine_paid,
			method, receipt_number, transaction_date, payment_date, collected_by, collected_by_id,
			recovery_officer, remarks, is_full_payment, created_at
		FROM payments WHERE installment_plan_id = ? ORDER BY transaction_date DESC`, planID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []domain.Payment
	for rows.Next() {
		var p domain.Payment
		var receiptNumber, collectedBy, collectedById, recoveryOfficer, remarks sql.NullString
		err := rows.Scan(&p.ID, &p.InstallmentPlanID, &p.InstallmentNo, &p.Amount, &p.AmountWithoutFine, &p.FinePaid,
			&p.Method, &receiptNumber, &p.TransactionDate, &p.PaymentDate, &collectedBy, &collectedById,
			&recoveryOfficer, &remarks, &p.IsFullPayment, &p.CreatedAt)
		if err != nil {
			return nil, err
		}
		p.ReceiptNumber = receiptNumber.String
		p.CollectedBy = collectedBy.String
		p.CollectedById = collectedById.String
		p.RecoveryOfficer = recoveryOfficer.String
		p.Remarks = remarks.String
		payments = append(payments, p)
	}
	return payments, nil
}

func (r *PaymentRepository) ListAll(ctx context.Context, skip, limit int64) ([]domain.Payment, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, installment_plan_id, installment_no, amount, amount_without_fine, fine_paid,
			method, receipt_number, transaction_date, payment_date, collected_by, collected_by_id,
			recovery_officer, remarks, is_full_payment, created_at
		FROM payments ORDER BY transaction_date DESC LIMIT ? OFFSET ?`, limit, skip)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []domain.Payment
	for rows.Next() {
		var p domain.Payment
		var receiptNumber, collectedBy, collectedById, recoveryOfficer, remarks sql.NullString
		err := rows.Scan(&p.ID, &p.InstallmentPlanID, &p.InstallmentNo, &p.Amount, &p.AmountWithoutFine, &p.FinePaid,
			&p.Method, &receiptNumber, &p.TransactionDate, &p.PaymentDate, &collectedBy, &collectedById,
			&recoveryOfficer, &remarks, &p.IsFullPayment, &p.CreatedAt)
		if err != nil {
			return nil, err
		}
		p.ReceiptNumber = receiptNumber.String
		p.CollectedBy = collectedBy.String
		p.CollectedById = collectedById.String
		p.RecoveryOfficer = recoveryOfficer.String
		p.Remarks = remarks.String
		payments = append(payments, p)
	}
	return payments, nil
}

func (r *PaymentRepository) GetPaymentsByDateRange(ctx context.Context, start, end time.Time) ([]domain.Payment, error) {

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, installment_plan_id, installment_no, amount, amount_without_fine, fine_paid,
			method, receipt_number, transaction_date, payment_date, collected_by, collected_by_id,
			recovery_officer, remarks, is_full_payment, created_at
		FROM payments WHERE transaction_date >= ? AND transaction_date < ? ORDER BY transaction_date DESC`, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []domain.Payment
	for rows.Next() {
		var p domain.Payment
		var receiptNumber, collectedBy, collectedById, recoveryOfficer, remarks sql.NullString
		err := rows.Scan(&p.ID, &p.InstallmentPlanID, &p.InstallmentNo, &p.Amount, &p.AmountWithoutFine, &p.FinePaid,
			&p.Method, &receiptNumber, &p.TransactionDate, &p.PaymentDate, &collectedBy, &collectedById,
			&recoveryOfficer, &remarks, &p.IsFullPayment, &p.CreatedAt)
		if err != nil {
			return nil, err
		}
		p.ReceiptNumber = receiptNumber.String
		p.CollectedBy = collectedBy.String
		p.CollectedById = collectedById.String
		p.RecoveryOfficer = recoveryOfficer.String
		p.Remarks = remarks.String
		payments = append(payments, p)
	}
	return payments, nil
}

func (r *PaymentRepository) GetTodayPayments(ctx context.Context) ([]domain.Payment, error) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	end := start.Add(24 * time.Hour)
	return r.GetPaymentsByDateRange(ctx, start, end)
}

func (r *PaymentRepository) GetMonthlyPayments(ctx context.Context, year int, month time.Month) ([]domain.Payment, error) {
	start := time.Date(year, month, 1, 0, 0, 0, 0, time.Local)
	end := start.AddDate(0, 1, 0)
	return r.GetPaymentsByDateRange(ctx, start, end)
}

func (r *PaymentRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM payments WHERE id = ?", id)
	return err
}

func (r *PaymentRepository) DeleteByInstallment(ctx context.Context, planID string, installmentNo int) (int64, error) {
	result, err := r.db.ExecContext(ctx, "DELETE FROM payments WHERE installment_plan_id = ? AND installment_no = ?", planID, installmentNo)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}
