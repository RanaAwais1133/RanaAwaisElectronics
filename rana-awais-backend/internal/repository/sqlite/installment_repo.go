package sqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/google/uuid"
)

type InstallmentRepository struct {
	db *sql.DB
}

func NewInstallmentRepository(db *sql.DB) *InstallmentRepository {
	return &InstallmentRepository{db: db}
}

func (r *InstallmentRepository) Create(ctx context.Context, plan *domain.InstallmentPlan) error {
	if plan.ID == "" {
		plan.ID = uuid.New().String()
	}
	plan.CreatedAt = time.Now()
	plan.UpdatedAt = time.Now()

	guarantorIDs, _ := json.Marshal(plan.GuarantorIDs)

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO installment_plans (
			id, customer_id, product_id, inventory_item_id, total_amount, down_payment, remaining_amount,
			num_installments, installment_amount, start_date, end_date, grace_period_days, fine_per_day,
			fine_type, fixed_fine_amount, status, installment_date, payment_type, serial_number, imei,
			engine_no, chassis_no, model, color, company, process_fee, discount, salary_income,
			defaulter, pto, vpn_status, employee_status, dbm_remarks, crc_remarks, process_at,
			do_officer, mark_off, debt_mng, second_mng, insp_off, srm, mobile_phone, crc, created_by,
			created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		plan.ID, plan.CustomerID, plan.ProductID, plan.InventoryItemID, plan.TotalAmount, plan.DownPayment, plan.RemainingAmount,
		plan.NumberOfInstallments, plan.InstallmentAmount, plan.StartDate, plan.EndDate, plan.GracePeriodDays, plan.FinePerDay,
		plan.FineType, plan.FixedFineAmount, plan.Status, plan.InstallmentDate, plan.PaymentType, plan.SerialNumber, plan.IMEI,
		plan.EngineNo, plan.ChassisNo, plan.Model, plan.Color, plan.Company, plan.ProcessFee, plan.Discount, plan.SalaryIncome,
		plan.Defaulter, plan.PTO, plan.VPNStatus, plan.EmployeeStatus, plan.DBMRemarks, plan.CRCRemarks, plan.ProcessAt,
		plan.DOOfficer, plan.MarkOff, plan.DebtMng, plan.SecondMng, plan.InspOff, plan.SRM, plan.MobilePhone, plan.CRC, plan.CreatedBy,
		plan.CreatedAt, plan.UpdatedAt)
	if err != nil {
		return err
	}

	// Insert installment details
	for _, inst := range plan.Installments {
		_, err = r.db.ExecContext(ctx, `
			INSERT INTO installment_details (plan_id, installment_no, due_date, amount, paid, paid_date,
				fine, fine_per_day, days_late, fine_applied, total_payable, partial_paid, remaining,
				collected_by, collected_by_id, remarks)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			plan.ID, inst.InstallmentNo, inst.DueDate, inst.Amount, boolToInt(inst.Paid), inst.PaidDate,
			inst.Fine, inst.FinePerDay, inst.DaysLate, inst.FineApplied, inst.TotalPayable, inst.PartialPaid, inst.Remaining,
			inst.CollectedBy, inst.CollectedById, inst.Remarks)
		if err != nil {
			return err
		}
	}

	_ = guarantorIDs
	return nil
}

func (r *InstallmentRepository) GetByID(ctx context.Context, id string) (*domain.InstallmentPlan, error) {
	plan := &domain.InstallmentPlan{}
	var inventoryItemID, serialNumber, imei, engineNo, chassisNo, model, color, company, paymentType, defaulter, pto, vpnStatus, employeeStatus, dbmRemarks, crcRemarks, processAt, doOfficer, markOff, debtMng, secondMng, inspOff, srm, mobilePhone, crc, createdBy sql.NullString

	err := r.db.QueryRowContext(ctx, `
		SELECT id, customer_id, product_id, inventory_item_id, total_amount, down_payment, remaining_amount,
			num_installments, installment_amount, start_date, end_date, grace_period_days, fine_per_day,
			fine_type, fixed_fine_amount, status, installment_date, payment_type, serial_number, imei,
			engine_no, chassis_no, model, color, company, process_fee, discount, salary_income,
			defaulter, pto, vpn_status, employee_status, dbm_remarks, crc_remarks, process_at,
			do_officer, mark_off, debt_mng, second_mng, insp_off, srm, mobile_phone, crc, created_by,
			created_at, updated_at
		FROM installment_plans WHERE id = ?`, id).Scan(
		&plan.ID, &plan.CustomerID, &plan.ProductID, &inventoryItemID,
		&plan.TotalAmount, &plan.DownPayment, &plan.RemainingAmount,
		&plan.NumberOfInstallments, &plan.InstallmentAmount, &plan.StartDate, &plan.EndDate,
		&plan.GracePeriodDays, &plan.FinePerDay, &plan.FineType, &plan.FixedFineAmount,
		&plan.Status, &plan.InstallmentDate, &paymentType, &serialNumber, &imei,
		&engineNo, &chassisNo, &model, &color, &company, &plan.ProcessFee, &plan.Discount, &plan.SalaryIncome,
		&defaulter, &pto, &vpnStatus, &employeeStatus, &dbmRemarks, &crcRemarks, &processAt,
		&doOfficer, &markOff, &debtMng, &secondMng, &inspOff, &srm, &mobilePhone, &crc, &createdBy,
		&plan.CreatedAt, &plan.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	plan.InventoryItemID = inventoryItemID.String
	plan.PaymentType = paymentType.String
	plan.SerialNumber = serialNumber.String
	plan.IMEI = imei.String
	plan.EngineNo = engineNo.String
	plan.ChassisNo = chassisNo.String
	plan.Model = model.String
	plan.Color = color.String
	plan.Company = company.String
	plan.Defaulter = defaulter.String
	plan.PTO = pto.String
	plan.VPNStatus = vpnStatus.String
	plan.EmployeeStatus = employeeStatus.String
	plan.DBMRemarks = dbmRemarks.String
	plan.CRCRemarks = crcRemarks.String
	plan.ProcessAt = processAt.String
	plan.DOOfficer = doOfficer.String
	plan.MarkOff = markOff.String
	plan.DebtMng = debtMng.String
	plan.SecondMng = secondMng.String
	plan.InspOff = inspOff.String
	plan.SRM = srm.String
	plan.MobilePhone = mobilePhone.String
	plan.CRC = crc.String
	plan.CreatedBy = createdBy.String
	plan.GuarantorIDs = []string{}

	// Load installment details
	details, err := r.loadInstallmentDetails(ctx, plan.ID)
	if err != nil {
		return nil, err
	}
	plan.Installments = details

	return plan, nil
}

func (r *InstallmentRepository) loadInstallmentDetails(ctx context.Context, planID string) ([]domain.InstallmentDetail, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT installment_no, due_date, amount, paid, paid_date, fine, fine_per_day, days_late,
			fine_applied, total_payable, partial_paid, remaining, collected_by, collected_by_id, remarks
		FROM installment_details WHERE plan_id = ? ORDER BY installment_no`, planID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var details []domain.InstallmentDetail
	for rows.Next() {
		var d domain.InstallmentDetail
		var paidDate sql.NullTime
		err := rows.Scan(&d.InstallmentNo, &d.DueDate, &d.Amount, &d.Paid, &paidDate,
			&d.Fine, &d.FinePerDay, &d.DaysLate, &d.FineApplied, &d.TotalPayable, &d.PartialPaid, &d.Remaining,
			&d.CollectedBy, &d.CollectedById, &d.Remarks)
		if err != nil {
			return nil, err
		}
		if paidDate.Valid {
			d.PaidDate = &paidDate.Time
		}
		details = append(details, d)
	}
	return details, nil
}

func (r *InstallmentRepository) Update(ctx context.Context, id string, plan *domain.InstallmentPlan) error {
	plan.UpdatedAt = time.Now()

	guarantorIDs, _ := json.Marshal(plan.GuarantorIDs)

	_, err := r.db.ExecContext(ctx, `
		UPDATE installment_plans SET customer_id=?, product_id=?, inventory_item_id=?, total_amount=?, down_payment=?, remaining_amount=?,
			num_installments=?, installment_amount=?, start_date=?, end_date=?, grace_period_days=?, fine_per_day=?,
			fine_type=?, fixed_fine_amount=?, status=?, installment_date=?, payment_type=?, serial_number=?, imei=?,
			engine_no=?, chassis_no=?, model=?, color=?, company=?, process_fee=?, discount=?, salary_income=?,
			defaulter=?, pto=?, vpn_status=?, employee_status=?, dbm_remarks=?, crc_remarks=?, process_at=?,
			do_officer=?, mark_off=?, debt_mng=?, second_mng=?, insp_off=?, srm=?, mobile_phone=?, crc=?, created_by=?,
			updated_at=?
		WHERE id=?`,
		plan.CustomerID, plan.ProductID, plan.InventoryItemID, plan.TotalAmount, plan.DownPayment, plan.RemainingAmount,
		plan.NumberOfInstallments, plan.InstallmentAmount, plan.StartDate, plan.EndDate, plan.GracePeriodDays, plan.FinePerDay,
		plan.FineType, plan.FixedFineAmount, plan.Status, plan.InstallmentDate, plan.PaymentType, plan.SerialNumber, plan.IMEI,
		plan.EngineNo, plan.ChassisNo, plan.Model, plan.Color, plan.Company, plan.ProcessFee, plan.Discount, plan.SalaryIncome,
		plan.Defaulter, plan.PTO, plan.VPNStatus, plan.EmployeeStatus, plan.DBMRemarks, plan.CRCRemarks, plan.ProcessAt,
		plan.DOOfficer, plan.MarkOff, plan.DebtMng, plan.SecondMng, plan.InspOff, plan.SRM, plan.MobilePhone, plan.CRC, plan.CreatedBy,
		plan.UpdatedAt, id)
	if err != nil {
		return err
	}

	// Delete old details and re-insert
	_, err = r.db.ExecContext(ctx, "DELETE FROM installment_details WHERE plan_id = ?", id)
	if err != nil {
		return err
	}

	for _, inst := range plan.Installments {
		_, err = r.db.ExecContext(ctx, `
			INSERT INTO installment_details (plan_id, installment_no, due_date, amount, paid, paid_date,
				fine, fine_per_day, days_late, fine_applied, total_payable, partial_paid, remaining,
				collected_by, collected_by_id, remarks)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			id, inst.InstallmentNo, inst.DueDate, inst.Amount, boolToInt(inst.Paid), inst.PaidDate,
			inst.Fine, inst.FinePerDay, inst.DaysLate, inst.FineApplied, inst.TotalPayable, inst.PartialPaid, inst.Remaining,
			inst.CollectedBy, inst.CollectedById, inst.Remarks)
		if err != nil {
			return err
		}
	}

	_ = guarantorIDs
	return nil
}

func (r *InstallmentRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM installment_details WHERE plan_id = ?", id)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, "DELETE FROM installment_plans WHERE id = ?", id)
	return err
}

func (r *InstallmentRepository) ListByCustomer(ctx context.Context, customerID string) ([]domain.InstallmentPlan, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id FROM installment_plans WHERE customer_id = ? ORDER BY created_at DESC`, customerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []domain.InstallmentPlan
	for rows.Next() {
		var id string
		err := rows.Scan(&id)
		if err != nil {
			return nil, err
		}
		plan, err := r.GetByID(ctx, id)
		if err != nil {
			return nil, err
		}
		if plan != nil {
			plans = append(plans, *plan)
		}
	}
	return plans, nil
}

func (r *InstallmentRepository) GetActivePlans(ctx context.Context) ([]domain.InstallmentPlan, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id FROM installment_plans WHERE status = 'active' ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []domain.InstallmentPlan
	for rows.Next() {
		var id string
		err := rows.Scan(&id)
		if err != nil {
			return nil, err
		}
		plan, err := r.GetByID(ctx, id)
		if err != nil {
			return nil, err
		}
		if plan != nil {
			plans = append(plans, *plan)
		}
	}
	return plans, nil
}

func (r *InstallmentRepository) GetPlansWithDueDate(ctx context.Context, dueDate time.Time) ([]domain.InstallmentPlan, error) {
	startOfDay := time.Date(dueDate.Year(), dueDate.Month(), dueDate.Day(), 0, 0, 0, 0, dueDate.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT plan_id FROM installment_details 
		WHERE due_date >= ? AND due_date < ? AND paid = 0`, startOfDay, endOfDay)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []domain.InstallmentPlan
	for rows.Next() {
		var id string
		err := rows.Scan(&id)
		if err != nil {
			return nil, err
		}
		plan, err := r.GetByID(ctx, id)
		if err != nil {
			return nil, err
		}
		if plan != nil {
			plans = append(plans, *plan)
		}
	}
	return plans, nil
}

func (r *InstallmentRepository) AddPaymentDetail(ctx context.Context, planID string, installmentNo int, payment domain.InstallmentDetail) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE installment_details SET paid=?, paid_date=?, fine=?, partial_paid=?, remaining=?,
			collected_by=?, collected_by_id=?, remarks=?
		WHERE plan_id=? AND installment_no=?`,
		boolToInt(payment.Paid), payment.PaidDate, payment.Fine, payment.PartialPaid, payment.Remaining,
		payment.CollectedBy, payment.CollectedById, payment.Remarks, planID, installmentNo)
	return err
}

func (r *InstallmentRepository) UpdateInstallmentStatus(ctx context.Context, planID string, installmentNo int, paid bool, paidDate *time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE installment_details SET paid=?, paid_date=? WHERE plan_id=? AND installment_no=?`,
		boolToInt(paid), paidDate, planID, installmentNo)
	return err
}

func (r *InstallmentRepository) GetPlansWithDueDateRange(ctx context.Context, start, end time.Time) ([]domain.InstallmentPlan, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT plan_id FROM installment_details 
		WHERE due_date >= ? AND due_date < ? AND paid = 0`, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []domain.InstallmentPlan
	for rows.Next() {
		var id string
		err := rows.Scan(&id)
		if err != nil {
			return nil, err
		}
		plan, err := r.GetByID(ctx, id)
		if err != nil {
			return nil, err
		}
		if plan != nil {
			plans = append(plans, *plan)
		}
	}
	return plans, nil
}

func (r *InstallmentRepository) ListAll(ctx context.Context, skip, limit int64) ([]domain.InstallmentPlan, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id FROM installment_plans ORDER BY created_at DESC LIMIT ? OFFSET ?`, limit, skip)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []domain.InstallmentPlan
	for rows.Next() {
		var id string
		err := rows.Scan(&id)
		if err != nil {
			return nil, err
		}
		plan, err := r.GetByID(ctx, id)
		if err != nil {
			return nil, err
		}
		if plan != nil {
			plans = append(plans, *plan)
		}
	}
	return plans, nil
}

func (r *InstallmentRepository) GetInstallmentsByDateRange(ctx context.Context, start, end time.Time) ([]domain.InstallmentDetail, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT d.installment_no, d.due_date, d.amount, d.paid, d.paid_date, d.fine, d.fine_per_day, d.days_late,
			d.fine_applied, d.total_payable, d.partial_paid, d.remaining, d.collected_by, d.collected_by_id, d.remarks
		FROM installment_details d
		JOIN installment_plans p ON d.plan_id = p.id
		WHERE d.due_date >= ? AND d.due_date < ? AND p.status = 'active'`, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var details []domain.InstallmentDetail
	for rows.Next() {
		var d domain.InstallmentDetail
		var paidDate sql.NullTime
		err := rows.Scan(&d.InstallmentNo, &d.DueDate, &d.Amount, &d.Paid, &paidDate,
			&d.Fine, &d.FinePerDay, &d.DaysLate, &d.FineApplied, &d.TotalPayable, &d.PartialPaid, &d.Remaining,
			&d.CollectedBy, &d.CollectedById, &d.Remarks)
		if err != nil {
			return nil, err
		}
		if paidDate.Valid {
			d.PaidDate = &paidDate.Time
		}
		details = append(details, d)
	}
	return details, nil
}
