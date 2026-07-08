package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/thermal"
)

type ReceiptService struct {
	paymentRepo repository.PaymentRepository
	planRepo    repository.InstallmentRepository
	custRepo    repository.CustomerRepository
	printer     thermal.Printer
	cfg         *config.Config
}

func NewReceiptService(
	payRepo repository.PaymentRepository,
	planRepo repository.InstallmentRepository,
	custRepo repository.CustomerRepository,
	printer thermal.Printer,
) *ReceiptService {
	return &ReceiptService{
		paymentRepo: payRepo,
		planRepo:    planRepo,
		custRepo:    custRepo,
		printer:     printer,
	}
}

func (s *ReceiptService) SetConfig(cfg *config.Config) {
	s.cfg = cfg
}

func (s *ReceiptService) getConfig() *config.Config {
	if s.cfg != nil {
		return s.cfg
	}
	if config.APP_CONFIG != nil {
		return &config.Config{
			CompanyName:   config.APP_CONFIG.CompanyName,
			CompanyNameUr: config.APP_CONFIG.CompanyNameUr,
			SoftwareBy:    config.APP_CONFIG.SoftwareBy,
			SoftwareByUr:  config.APP_CONFIG.SoftwareByUr,
		}
	}
	return &config.Config{}
}

func (s *ReceiptService) GenerateAndPrintReceipt(ctx context.Context, paymentID string) error {
	payment, err := s.paymentRepo.GetByID(ctx, paymentID)
	if err != nil || payment == nil {
		return errors.New("payment not found")
	}
	plan, err := s.planRepo.GetByID(ctx, payment.InstallmentPlanID)
	if err != nil || plan == nil {
		return errors.New("installment plan not found")
	}
	cust, err := s.custRepo.GetByID(ctx, plan.CustomerID)
	if err != nil || cust == nil {
		return errors.New("customer not found")
	}
	cfg := s.getConfig()

	receipt := fmt.Sprintf(
		"%s\n%s\n==========\n%s: %s\nFather: %s\nPhone: %s\n%s: %d\n%s: Rs. %.2f\n%s: %s\n",
		cfg.CompanyName,
		cfg.CompanyNameUr,
		"Customer", cust.Name,
		cust.FatherName,
		cust.Phone,
		"Installment #", payment.InstallmentNo,
		"Amount", payment.Amount,
		"Date", payment.TransactionDate.Format("2006-01-02 15:04"),
	)

	if payment.Remarks != "" {
		receipt += fmt.Sprintf("Remarks: %s\n", payment.Remarks)
	}
	if payment.CollectedBy != "" {
		receipt += fmt.Sprintf("Collected By: %s\n", payment.CollectedBy)
	}

	receipt += fmt.Sprintf("==========\n%s\n%s", cfg.SoftwareBy, cfg.SoftwareByUr)

	return s.printer.PrintBilingual(cfg.CompanyName, cfg.CompanyNameUr, receipt, "")
}

func (s *ReceiptService) DownloadReceiptData(ctx context.Context, planID string) (map[string]interface{}, error) {
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil || plan == nil {
		return nil, errors.New("installment plan not found")
	}
	cust, err := s.custRepo.GetByID(ctx, plan.CustomerID)
	if err != nil || cust == nil {
		return nil, errors.New("customer not found")
	}

	payments, err := s.paymentRepo.ListByPlan(ctx, planID)
	if err != nil {
		payments = nil
	}

	return map[string]interface{}{
		"plan":      plan,
		"customer":  cust,
		"payments":  payments,
		"company":   s.getConfig().GetCompanyInfo(),
	}, nil
}