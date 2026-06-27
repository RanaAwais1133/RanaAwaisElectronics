package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/your-org/rana-awais-backend/config"
	"github.com/your-org/rana-awais-backend/internal/repository"
	"github.com/your-org/rana-awais-backend/pkg/thermal"
	"go.mongodb.org/mongo-driver/bson/primitive"
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

// SetConfig sets the config for the service
func (s *ReceiptService) SetConfig(cfg *config.Config) {
	s.cfg = cfg
}

func (s *ReceiptService) GenerateAndPrintReceipt(ctx context.Context, paymentID primitive.ObjectID) error {
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

	// Get company info from config
	companyName := "RANA AWAIS ELECTRONICS"
	companyNameUr := "رانا اویس الیکٹرانکس"
	softwareBy := "Huzaifa (0313-6487199)"
	softwareByUr := "حذیفہ (0313-6487199)"
	
	if s.cfg != nil {
		companyName = s.cfg.CompanyName
		companyNameUr = s.cfg.CompanyNameUr
		softwareBy = s.cfg.SoftwareBy
		softwareByUr = s.cfg.SoftwareByUr
	}

	headerEn := fmt.Sprintf("%s\nPayment Receipt", companyName)
	headerUr := fmt.Sprintf("%s\nادائیگی رسید", companyNameUr)

	bodyEn := fmt.Sprintf("Customer: %s\n", cust.Name)
	if cust.FatherName != "" {
		bodyEn += fmt.Sprintf("Father: %s\n", cust.FatherName)
	}
	bodyEn += fmt.Sprintf("Phone: %s\n", cust.Phone)
	if cust.Address != "" {
		bodyEn += fmt.Sprintf("Address: %s\n", cust.Address)
	}
	bodyEn += fmt.Sprintf("Installment No: %d\n", payment.InstallmentNo)
	bodyEn += fmt.Sprintf("Amount Paid: Rs. %.2f\n", payment.Amount)
	
	// Show fine if any
	if payment.FinePaid > 0 {
		bodyEn += fmt.Sprintf("Fine Paid: Rs. %.2f\n", payment.FinePaid)
		bodyEn += fmt.Sprintf("Amount Without Fine: Rs. %.2f\n", payment.AmountWithoutFine)
	}
	
	bodyEn += fmt.Sprintf("Method: %s\n", payment.Method)
	bodyEn += fmt.Sprintf("Date: %s\n", payment.TransactionDate.Format("02-Jan-2006 03:04 PM"))
	bodyEn += fmt.Sprintf("Total Plan: Rs. %.2f\n", plan.TotalAmount)
	bodyEn += fmt.Sprintf("Remaining: Rs. %.2f\n", plan.RemainingAmount)
	bodyEn += "\nThank you for your payment!"
	bodyEn += fmt.Sprintf("\nSoftware by: %s", softwareBy)

	bodyUr := fmt.Sprintf("گاہک: %s\n", cust.NameUrdu)
	if cust.FatherName != "" {
		bodyUr += fmt.Sprintf("والد: %s\n", cust.FatherName)
	}
	bodyUr += fmt.Sprintf("فون: %s\n", cust.Phone)
	if cust.AddressUrdu != "" {
		bodyUr += fmt.Sprintf("پتہ: %s\n", cust.AddressUrdu)
	}
	bodyUr += fmt.Sprintf("قسط نمبر: %d\n", payment.InstallmentNo)
	bodyUr += fmt.Sprintf("ادا کردہ رقم: %.2f روپے\n", payment.Amount)
	
	if payment.FinePaid > 0 {
		bodyUr += fmt.Sprintf("جرمانہ: %.2f روپے\n", payment.FinePaid)
		bodyUr += fmt.Sprintf("بغیر جرمانہ رقم: %.2f روپے\n", payment.AmountWithoutFine)
	}
	
	bodyUr += fmt.Sprintf("طریقہ: %s\n", payment.Method)
	bodyUr += fmt.Sprintf("تاریخ: %s\n", payment.TransactionDate.Format("02-Jan-2006 03:04 PM"))
	bodyUr += fmt.Sprintf("کل پلان: %.2f روپے\n", plan.TotalAmount)
	bodyUr += fmt.Sprintf("باقی: %.2f روپے\n", plan.RemainingAmount)
	bodyUr += "\nادائیگی کا شکریہ!"
	bodyUr += fmt.Sprintf("\nسافٹ ویئر بذریعہ: %s", softwareByUr)

	if err := s.printer.PrintBilingual(headerEn, headerUr, bodyEn, bodyUr); err != nil {
		return err
	}
	return nil
}