package service

import (
	"context"
	"errors"
	"math"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type BulkPaymentItem struct {
	InstallmentNo int     `json:"installment_no"`
	Amount        float64 `json:"amount"`
}

type PaymentResult struct {
	Message          string  `json:"message"`
	Amount           float64 `json:"amount"`
	InstallmentNo    int     `json:"installment_no"`
	AppliedTo        int     `json:"applied_to"`
	ExcessForwarded  float64 `json:"excess_forwarded"`
	RemainingBalance float64 `json:"remaining_balance"`
	InstallmentPaid  bool    `json:"installment_paid"`
}

type InstallmentService struct {
	planRepo      repository.InstallmentRepository
	paymentRepo   repository.PaymentRepository
	accRepo       repository.AccountingRepository
	notifRepo     repository.NotificationRepository
	custRepo      repository.CustomerRepository
	inventoryRepo repository.InventoryRepository
	guarRepo      repository.GuarantorRepository
	prodRepo      repository.ProductRepository
}

func NewInstallmentService(
	planRepo repository.InstallmentRepository,
	paymentRepo repository.PaymentRepository,
	accRepo repository.AccountingRepository,
	notifRepo repository.NotificationRepository,
	custRepo repository.CustomerRepository,
	inventoryRepo repository.InventoryRepository,
	guarRepo repository.GuarantorRepository,
	prodRepo repository.ProductRepository,
) *InstallmentService {
	return &InstallmentService{
		planRepo:      planRepo,
		paymentRepo:   paymentRepo,
		accRepo:       accRepo,
		notifRepo:     notifRepo,
		custRepo:      custRepo,
		inventoryRepo: inventoryRepo,
		guarRepo:      guarRepo,
		prodRepo:      prodRepo,
	}
}

// ============================================================
// CREATE PLAN
// ============================================================
func (s *InstallmentService) CreatePlan(ctx context.Context, plan *domain.InstallmentPlan) error {
	// Customer validation
	cust, err := s.custRepo.GetByID(ctx, plan.CustomerID)
	if err != nil || cust == nil {
		return errors.New("customer not found")
	}

	// Product stock check
	product, err := s.prodRepo.GetByIDWithStock(ctx, plan.ProductID)
	if err != nil || product == nil {
		return errors.New("product not found")
	}
	if product.StockCount <= 0 && !product.InStock {
		return errors.New("product is out of stock")
	}

	// Amount validations
	if plan.TotalAmount <= 0 {
		return errors.New("total amount must be greater than zero")
	}
	if plan.DownPayment < 0 {
		plan.DownPayment = 0
	}
	if plan.DownPayment > plan.TotalAmount {
		return errors.New("down payment cannot exceed total amount")
	}
	if plan.RemainingAmount <= 0 {
		plan.RemainingAmount = plan.TotalAmount - plan.DownPayment
	}
	if plan.RemainingAmount < 0 {
		return errors.New("remaining amount cannot be negative")
	}

	// Auto-calculate installments from per-month amount
	if plan.InstallmentAmount > 0 && plan.NumberOfInstallments <= 0 {
		remaining := plan.RemainingAmount
		perMonth := plan.InstallmentAmount
		if perMonth <= 0 {
			return errors.New("installment amount must be greater than zero")
		}
		months := int(math.Ceil(remaining / perMonth))
		plan.NumberOfInstallments = months
	}

	if plan.RemainingAmount > 0 && plan.NumberOfInstallments <= 0 {
		return errors.New("number of installments must be greater than zero")
	}
	if plan.GracePeriodDays < 0 {
		plan.GracePeriodDays = 0
	}
	if plan.FinePerDay < 0 {
		plan.FinePerDay = 0
	}

	// Calculate installment amount if not set
	if plan.RemainingAmount == 0 {
		plan.InstallmentAmount = 0
	} else if plan.InstallmentAmount <= 0 {
		plan.InstallmentAmount = math.Round((plan.RemainingAmount/float64(plan.NumberOfInstallments))*100) / 100
	}

	// Inventory handling
	if !plan.InventoryItemID.IsZero() {
		item, err := s.inventoryRepo.GetByID(ctx, plan.InventoryItemID)
		if err != nil || item == nil || item.Status != "in_stock" {
			return errors.New("inventory item not available")
		}
	} else {
		items, err := s.inventoryRepo.ListByProduct(ctx, plan.ProductID)
		if err == nil {
			for _, item := range items {
				if item.Status == "in_stock" {
					plan.InventoryItemID = item.ID
					break
				}
			}
		}
	}

	// Mark inventory as sold
	if !plan.InventoryItemID.IsZero() {
		item, err := s.inventoryRepo.GetByID(ctx, plan.InventoryItemID)
		if err == nil && item != nil && item.Status == "in_stock" {
			now := time.Now()
			item.Status = "sold"
			item.SoldDate = &now
			s.inventoryRepo.Update(ctx, item.ID, item)
		}
	}

	// Record downpayment as income
	if plan.DownPayment > 0 {
		now := time.Now()
		s.accRepo.Create(ctx, &domain.AccountingEntry{
			Type:          "income",
			Basis:         "cash_flow",
			Amount:        plan.DownPayment,
			Description:   "Down payment",
			RelatedPlanID: &plan.ID,
			Date:          now,
		})
		if product.PurchasePrice > 0 && plan.TotalAmount > 0 {
			costAmount := math.Round((plan.DownPayment/plan.TotalAmount)*product.PurchasePrice*100) / 100
			if costAmount > 0 {
				s.accRepo.Create(ctx, &domain.AccountingEntry{
					Type:          "expense",
					Basis:         "cash_flow",
					Amount:        costAmount,
					Description:   "Cost of goods sold (down payment)",
					RelatedPlanID: &plan.ID,
					Date:          now,
				})
			}
		}
	}

	// Full payment case (no installments)
	if plan.RemainingAmount == 0 {
		plan.Installments = nil
		plan.Status = "completed"
		plan.EndDate = plan.StartDate
		return s.planRepo.Create(ctx, plan)
	}

	// Generate schedule
	plan.Installments = s.generateSchedule(plan)
	if len(plan.Installments) > 0 {
		plan.EndDate = plan.Installments[len(plan.Installments)-1].DueDate
	}
	plan.Status = "active"
	return s.planRepo.Create(ctx, plan)
}

func (s *InstallmentService) generateSchedule(plan *domain.InstallmentPlan) []domain.InstallmentDetail {
	if plan.NumberOfInstallments <= 0 {
		return nil
	}
	var schedule []domain.InstallmentDetail
	amountPerInstallment := plan.InstallmentAmount
	if amountPerInstallment <= 0 {
		amountPerInstallment = math.Round((plan.RemainingAmount/float64(plan.NumberOfInstallments))*100) / 100
	}
	totalUsingPerMonth := amountPerInstallment * float64(plan.NumberOfInstallments)
	adjustment := plan.RemainingAmount - totalUsingPerMonth
	for i := 1; i <= plan.NumberOfInstallments; i++ {
		dueDate := plan.StartDate.AddDate(0, i, 0)
		amt := amountPerInstallment
		if i == plan.NumberOfInstallments {
			amt += adjustment
		}
		amt = math.Round(amt*100) / 100
		schedule = append(schedule, domain.InstallmentDetail{
			InstallmentNo: i,
			DueDate:       dueDate,
			Amount:        amt,
			Paid:          false,
			Fine:          0,
			PartialPaid:   0,
			Remaining:     amt,
		})
	}
	return schedule
}

// ============================================================
// RECORD PAYMENT (UPDATED with collectedById and remarks)
// ============================================================
func (s *InstallmentService) RecordPayment(
	ctx context.Context,
	planID primitive.ObjectID,
	installmentNo int,
	amount float64,
	method string,
	paymentDate string,
	dueDate string,
	collectedBy string,
	collectedById string,
	remarks string,
) (*PaymentResult, error) {

	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil || plan == nil {
		return nil, errors.New("plan not found")
	}
	if plan.Status != "active" && plan.Status != "overdue" {
		return nil, errors.New("plan is not active")
	}

	instIdx := -1
	for i, inst := range plan.Installments {
		if inst.InstallmentNo == installmentNo && !inst.Paid {
			instIdx = i
			break
		}
	}
	if instIdx == -1 {
		return nil, errors.New("installment not found or already paid")
	}

	var payTime time.Time
	if paymentDate != "" {
		payTime, err = time.Parse("2006-01-02", paymentDate)
		if err != nil {
			payTime = time.Now()
		}
	} else {
		payTime = time.Now()
	}

	if dueDate != "" {
		parsedDueDate, parseErr := time.Parse("2006-01-02", dueDate)
		if parseErr == nil {
			plan.Installments[instIdx].DueDate = parsedDueDate
		}
	}

	excess := amount
	appliedTo := installmentNo
	installmentPaid := false
	totalFinePaid := 0.0
	totalAmountWithoutFine := 0.0

	for i := instIdx; i < len(plan.Installments) && excess > 0; i++ {
		inst := &plan.Installments[i]
		if inst.Paid {
			continue
		}

		fine := s.CalculateFine(plan, *inst, payTime)
		totalDue := inst.Amount + fine - inst.PartialPaid
		if totalDue <= 0 {
			continue
		}
		
		applyAmount := excess
		if applyAmount > totalDue {
			applyAmount = totalDue
		}
		
		// Calculate fine portion of this payment
		finePortion := 0.0
		if fine > 0 && applyAmount > inst.Amount-inst.PartialPaid {
			finePortion = applyAmount - (inst.Amount - inst.PartialPaid)
			if finePortion > fine {
				finePortion = fine
			}
			totalFinePaid += finePortion
		}
		totalAmountWithoutFine += applyAmount - finePortion

		excess -= applyAmount
		inst.PartialPaid += applyAmount
		inst.Remaining = totalDue - applyAmount
		inst.Fine = fine
		inst.CollectedBy = collectedBy
		inst.CollectedById = collectedById
		inst.Remarks = remarks
		
		if inst.Remaining <= 0 {
			inst.Paid = true
			paidDate := payTime
			inst.PaidDate = &paidDate
			if i == instIdx {
				installmentPaid = true
			}
		}
		appliedTo = inst.InstallmentNo

		if err := s.planRepo.AddPaymentDetail(ctx, planID, inst.InstallmentNo, *inst); err != nil {
			return nil, err
		}
	}

	if excess > 0.001 {
		return nil, errors.New("payment exceeds outstanding amount")
	}

	// Create payment record
	payment := &domain.Payment{
		InstallmentPlanID:  planID,
		InstallmentNo:      installmentNo,
		Amount:             amount,
		AmountWithoutFine:  totalAmountWithoutFine,
		FinePaid:           totalFinePaid,
		Method:             method,
		TransactionDate:    payTime,
		PaymentDate:        payTime,
		CollectedBy:        collectedBy,
		CollectedById:      collectedById,
		RecoveryOfficer:    collectedBy,
		Remarks:            remarks,
		IsFullPayment:      excess == 0 && installmentPaid,
	}

	if err := s.paymentRepo.Create(ctx, payment); err != nil {
		return nil, err
	}

	allPaid := true
	for _, inst := range plan.Installments {
		if !inst.Paid {
			allPaid = false
			break
		}
	}
	if allPaid {
		plan.Status = "completed"
		if err := s.planRepo.Update(ctx, planID, plan); err != nil {
			return nil, err
		}
	}

	remainingBalance := 0.0
	for _, inst := range plan.Installments {
		if !inst.Paid {
			remainingBalance += inst.Amount - inst.PartialPaid
		}
	}

	// Income entry
	s.accRepo.Create(ctx, &domain.AccountingEntry{
		Type:          "income",
		Basis:         "cash_flow",
		Amount:        amount,
		Description:   "Installment payment",
		RelatedPlanID: &planID,
		Date:          payTime,
	})

	// Expense entry
	product, _ := s.prodRepo.GetByID(ctx, plan.ProductID)
	if product != nil && product.PurchasePrice > 0 && plan.TotalAmount > 0 {
		costAmount := math.Round((amount/plan.TotalAmount)*product.PurchasePrice*100) / 100
		if costAmount > 0 {
			s.accRepo.Create(ctx, &domain.AccountingEntry{
				Type:          "expense",
				Basis:         "cash_flow",
				Amount:        costAmount,
				Description:   "Cost of goods sold",
				RelatedPlanID: &planID,
				Date:          payTime,
			})
		}
	}

	return &PaymentResult{
		Message:          "Payment recorded",
		Amount:           amount,
		InstallmentNo:    installmentNo,
		AppliedTo:        appliedTo,
		ExcessForwarded:  excess,
		RemainingBalance: remainingBalance,
		InstallmentPaid:  installmentPaid,
	}, nil
}

// ============================================================
// BULK PAYMENT (UPDATED with collectedById)
// ============================================================
func (s *InstallmentService) BulkPayment(
	ctx context.Context,
	planID primitive.ObjectID,
	payments []BulkPaymentItem,
	method string,
	paymentDate string,
	collectedBy string,
	collectedById string,
) error {

	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil || plan == nil {
		return errors.New("plan not found")
	}
	if plan.Status != "active" && plan.Status != "overdue" {
		return errors.New("plan is not active")
	}

	var payTime time.Time
	if paymentDate != "" {
		payTime, err = time.Parse("2006-01-02", paymentDate)
		if err != nil {
			payTime = time.Now()
		}
	} else {
		payTime = time.Now()
	}

	totalPaid := 0.0
	totalFinePaid := 0.0
	totalWithoutFine := 0.0

	for _, pay := range payments {
		var target *domain.InstallmentDetail
		for i := range plan.Installments {
			if plan.Installments[i].InstallmentNo == pay.InstallmentNo {
				target = &plan.Installments[i]
				break
			}
		}
		if target == nil || target.Paid {
			continue
		}

		fine := s.CalculateFine(plan, *target, payTime)
		totalDue := target.Amount + fine - target.PartialPaid
		applyAmount := pay.Amount
		if applyAmount > totalDue {
			applyAmount = totalDue
		}
		
		// Calculate fine portion
		finePortion := 0.0
		if fine > 0 && applyAmount > target.Amount-target.PartialPaid {
			finePortion = applyAmount - (target.Amount - target.PartialPaid)
			if finePortion > fine {
				finePortion = fine
			}
			totalFinePaid += finePortion
		}
		totalWithoutFine += applyAmount - finePortion
		
		target.PartialPaid += applyAmount
		target.Remaining = totalDue - applyAmount
		target.Fine = fine
		target.CollectedBy = collectedBy
		target.CollectedById = collectedById
		totalPaid += applyAmount

		if target.Remaining <= 0 {
			target.Paid = true
			paidDate := payTime
			target.PaidDate = &paidDate
		}

		if err := s.planRepo.AddPaymentDetail(ctx, planID, pay.InstallmentNo, *target); err != nil {
			return err
		}

		s.paymentRepo.Create(ctx, &domain.Payment{
			InstallmentPlanID:  planID,
			InstallmentNo:      pay.InstallmentNo,
			Amount:             applyAmount,
			AmountWithoutFine:  applyAmount - finePortion,
			FinePaid:           finePortion,
			Method:             method,
			TransactionDate:    payTime,
			PaymentDate:        payTime,
			CollectedBy:        collectedBy,
			CollectedById:      collectedById,
			RecoveryOfficer:    collectedBy,
		})

		s.accRepo.Create(ctx, &domain.AccountingEntry{
			Type:          "income",
			Basis:         "cash_flow",
			Amount:        applyAmount,
			Description:   "Bulk payment",
			RelatedPlanID: &planID,
			Date:          payTime,
		})

		product, _ := s.prodRepo.GetByID(ctx, plan.ProductID)
		if product != nil && product.PurchasePrice > 0 && plan.TotalAmount > 0 {
			costAmount := math.Round((applyAmount/plan.TotalAmount)*product.PurchasePrice*100) / 100
			if costAmount > 0 {
				s.accRepo.Create(ctx, &domain.AccountingEntry{
					Type:          "expense",
					Basis:         "cash_flow",
					Amount:        costAmount,
					Description:   "Cost of goods sold",
					RelatedPlanID: &planID,
					Date:          payTime,
				})
			}
		}
	}

	allPaid := true
	for _, inst := range plan.Installments {
		if !inst.Paid {
			allPaid = false
			break
		}
	}
	if allPaid {
		plan.Status = "completed"
		if err := s.planRepo.Update(ctx, planID, plan); err != nil {
			return err
		}
	}

	return nil
}

// ============================================================
// ADVANCE PAYMENT (UPDATED with collectedById)
// ============================================================
func (s *InstallmentService) AdvancePayment(
	ctx context.Context,
	planID primitive.ObjectID,
	amount float64,
	method string,
	paymentDate string,
	collectedBy string,
	collectedById string,
) error {

	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil || plan == nil {
		return errors.New("plan not found")
	}
	if plan.Status != "active" && plan.Status != "overdue" {
		return errors.New("plan is not active")
	}

	var payTime time.Time
	if paymentDate != "" {
		payTime, err = time.Parse("2006-01-02", paymentDate)
		if err != nil {
			payTime = time.Now()
		}
	} else {
		payTime = time.Now()
	}

	excess := amount
	totalPaid := 0.0
	totalFinePaid := 0.0
	totalWithoutFine := 0.0

	for i := range plan.Installments {
		inst := &plan.Installments[i]
		if inst.Paid {
			continue
		}
		if excess <= 0 {
			break
		}

		fine := s.CalculateFine(plan, *inst, payTime)
		totalDue := inst.Amount + fine - inst.PartialPaid
		applyAmount := excess
		if applyAmount > totalDue {
			applyAmount = totalDue
		}
		
		finePortion := 0.0
		if fine > 0 && applyAmount > inst.Amount-inst.PartialPaid {
			finePortion = applyAmount - (inst.Amount - inst.PartialPaid)
			if finePortion > fine {
				finePortion = fine
			}
			totalFinePaid += finePortion
		}
		totalWithoutFine += applyAmount - finePortion
		
		excess -= applyAmount
		totalPaid += applyAmount

		inst.PartialPaid += applyAmount
		inst.Remaining = totalDue - applyAmount
		inst.Fine = fine
		inst.CollectedBy = collectedBy
		inst.CollectedById = collectedById

		if inst.Remaining <= 0 {
			inst.Paid = true
			paidDate := payTime
			inst.PaidDate = &paidDate
		}

		if err := s.planRepo.AddPaymentDetail(ctx, planID, inst.InstallmentNo, *inst); err != nil {
			return err
		}
	}

	if excess > 0.001 {
		return errors.New("payment exceeds outstanding amount")
	}
	if totalPaid == 0 {
		return errors.New("no unpaid installments")
	}

	s.paymentRepo.Create(ctx, &domain.Payment{
		InstallmentPlanID:  planID,
		InstallmentNo:      0,
		Amount:             totalPaid,
		AmountWithoutFine:  totalWithoutFine,
		FinePaid:           totalFinePaid,
		Method:             method,
		TransactionDate:    payTime,
		PaymentDate:        payTime,
		CollectedBy:        collectedBy,
		CollectedById:      collectedById,
		RecoveryOfficer:    collectedBy,
	})

	s.accRepo.Create(ctx, &domain.AccountingEntry{
		Type:          "income",
		Basis:         "cash_flow",
		Amount:        totalPaid,
		Description:   "Advance payment",
		RelatedPlanID: &planID,
		Date:          payTime,
	})

	product, _ := s.prodRepo.GetByID(ctx, plan.ProductID)
	if product != nil && product.PurchasePrice > 0 && plan.TotalAmount > 0 {
		costAmount := math.Round((totalPaid/plan.TotalAmount)*product.PurchasePrice*100) / 100
		if costAmount > 0 {
			s.accRepo.Create(ctx, &domain.AccountingEntry{
				Type:          "expense",
				Basis:         "cash_flow",
				Amount:        costAmount,
				Description:   "Cost of goods sold",
				RelatedPlanID: &planID,
				Date:          payTime,
			})
		}
	}

	allPaid := true
	for _, inst := range plan.Installments {
		if !inst.Paid {
			allPaid = false
			break
		}
	}
	if allPaid {
		plan.Status = "completed"
		if err := s.planRepo.Update(ctx, planID, plan); err != nil {
			return err
		}
	}

	return nil
}

// ============================================================
// FINE CALCULATION
// ============================================================
func (s *InstallmentService) CalculateFine(plan *domain.InstallmentPlan, detail domain.InstallmentDetail, now time.Time) float64 {
	if detail.Paid || now.Before(detail.DueDate) {
		return 0
	}
	graceEnd := detail.DueDate.AddDate(0, 0, plan.GracePeriodDays)
	if now.Before(graceEnd) {
		return 0
	}
	daysOverdue := int(now.Sub(graceEnd).Hours() / 24)
	if daysOverdue <= 0 {
		return 0
	}
	fine := float64(daysOverdue) * plan.FinePerDay
	if fine > detail.Amount*2 {
		fine = detail.Amount * 2
	}
	return math.Round(fine*100) / 100
}

// ============================================================
// GET METHODS
// ============================================================
func (s *InstallmentService) GetPlanByID(ctx context.Context, id primitive.ObjectID) (*domain.InstallmentPlan, error) {
	return s.planRepo.GetByID(ctx, id)
}

func (s *InstallmentService) GetProductByID(ctx context.Context, id primitive.ObjectID) (*domain.Product, error) {
	return s.prodRepo.GetByID(ctx, id)
}

func (s *InstallmentService) ListByCustomer(ctx context.Context, customerID primitive.ObjectID) ([]domain.InstallmentPlan, error) {
	return s.planRepo.ListByCustomer(ctx, customerID)
}

func (s *InstallmentService) GetActivePlans(ctx context.Context) ([]domain.InstallmentPlan, error) {
	return s.planRepo.GetActivePlans(ctx)
}

// ============================================================
// RESCHEDULE
// ============================================================
func (s *InstallmentService) RescheduleCheck(ctx context.Context, planID primitive.ObjectID) error {
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil || plan == nil {
		return errors.New("plan not found")
	}
	now := time.Now()
	skippedCount := 0
	for _, inst := range plan.Installments {
		if !inst.Paid && inst.DueDate.AddDate(0, 0, plan.GracePeriodDays).Before(now) {
			skippedCount++
		}
	}
	if skippedCount >= 3 {
		plan.Status = "defaulted"
		if err := s.planRepo.Update(ctx, planID, plan); err != nil {
			return err
		}
		return errors.New("plan defaulted due to missed installments, manual rescheduling required")
	}
	return nil
}

func (s *InstallmentService) ReschedulePlan(ctx context.Context, planID primitive.ObjectID, option string, newNumInstallments int, newStartDate string) error {
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil || plan == nil {
		return errors.New("plan not found")
	}

	if option == "continue" {
		plan.Status = "active"
		return s.planRepo.Update(ctx, planID, plan)
	}

	if newNumInstallments <= 0 {
		return errors.New("number of installments must be greater than 0")
	}

	// Calculate remaining balance
	var remainingBalance float64
	paidAmount := 0.0
	for _, inst := range plan.Installments {
		if inst.Paid {
			paidAmount += inst.Amount
		}
	}
	remainingBalance = plan.TotalAmount - paidAmount - plan.DownPayment
	if remainingBalance <= 0 {
		return errors.New("no remaining balance to reschedule")
	}

	startDate, err := time.Parse("2006-01-02", newStartDate)
	if err != nil {
		return errors.New("invalid start date format, use YYYY-MM-DD")
	}

	newInstallmentAmount := math.Round(remainingBalance/float64(newNumInstallments)*100) / 100

	var newInstallments []domain.InstallmentDetail
	for i := 0; i < newNumInstallments; i++ {
		dueDate := startDate.AddDate(0, i, 0)
		amount := newInstallmentAmount
		if i == newNumInstallments-1 {
			totalSoFar := newInstallmentAmount * float64(newNumInstallments-1)
			amount = math.Round((remainingBalance-totalSoFar)*100) / 100
		}
		newInstallments = append(newInstallments, domain.InstallmentDetail{
			InstallmentNo: i + 1,
			DueDate:       dueDate,
			Amount:        amount,
			Paid:          false,
			PartialPaid:   0,
			Remaining:     amount,
			Fine:          0,
		})
	}

	plan.Installments = newInstallments
	plan.Status = "active"
	plan.InstallmentAmount = newInstallmentAmount
	plan.NumberOfInstallments = newNumInstallments
	plan.RemainingAmount = remainingBalance
	plan.StartDate = startDate
	plan.EndDate = startDate.AddDate(0, newNumInstallments-1, 0)

	return s.planRepo.Update(ctx, planID, plan)
}

// ============================================================
// DELETE PLAN
// ============================================================
func (s *InstallmentService) DeletePlan(ctx context.Context, planID primitive.ObjectID) error {
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil || plan == nil {
		return errors.New("plan not found")
	}
	if !plan.InventoryItemID.IsZero() {
		item, err := s.inventoryRepo.GetByID(ctx, plan.InventoryItemID)
		if err == nil && item != nil {
			item.Status = "in_stock"
			item.SoldDate = nil
			s.inventoryRepo.Update(ctx, item.ID, item)
		}
	}
	return s.planRepo.Delete(ctx, planID)
}

// ============================================================
// ✅ NEW: UPCOMING & OVERDUE INSTALLMENTS
// ============================================================
func (s *InstallmentService) GetUpcomingInstallments(ctx context.Context, days int) ([]domain.InstallmentDetail, error) {
	now := time.Now()
	end := now.AddDate(0, 0, days)
	return s.planRepo.GetInstallmentsByDateRange(ctx, now, end)
}

func (s *InstallmentService) GetOverdueInstallments(ctx context.Context) ([]domain.InstallmentDetail, error) {
	now := time.Now()
	start := time.Date(2000, 1, 1, 0, 0, 0, 0, now.Location())
	return s.planRepo.GetInstallmentsByDateRange(ctx, start, now)
}

// ============================================================
// ✅ NEW: GET PLAN WITH PAYMENTS
// ============================================================
func (s *InstallmentService) GetPlanWithPayments(ctx context.Context, planID primitive.ObjectID) (*domain.InstallmentPlan, []domain.Payment, error) {
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil || plan == nil {
		return nil, nil, errors.New("plan not found")
	}
	payments, err := s.paymentRepo.ListByPlan(ctx, planID)
	if err != nil {
		return plan, []domain.Payment{}, nil
	}
	return plan, payments, nil
}
