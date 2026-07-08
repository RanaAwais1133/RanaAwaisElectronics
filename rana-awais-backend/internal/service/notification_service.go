package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
)

type NotificationService struct {
	notifRepo repository.NotificationRepository
	planRepo  repository.InstallmentRepository
	custRepo  repository.CustomerRepository
	smsSender SmsSender
	waSender  WhatsAppSender
}

type SmsSender interface {
	Send(phone, message string) error
}

type WhatsAppSender interface {
	Send(phone, message string) error
}

func NewNotificationService(
	notifRepo repository.NotificationRepository,
	planRepo repository.InstallmentRepository,
	custRepo repository.CustomerRepository,
	sms SmsSender,
	wa WhatsAppSender,
) *NotificationService {
	return &NotificationService{
		notifRepo: notifRepo,
		planRepo:  planRepo,
		custRepo:  custRepo,
		smsSender: sms,
		waSender:  wa,
	}
}

func (s *NotificationService) SendReminders(ctx context.Context) error {
	now := time.Now()
	targetDate := now.AddDate(0, 0, 2)
	plans, err := s.planRepo.GetPlansWithDueDate(ctx, targetDate)
	if err != nil {
		return err
	}
	for _, plan := range plans {
		cust, err := s.custRepo.GetByID(ctx, plan.CustomerID)
		if err != nil || cust == nil {
			continue
		}
		for _, inst := range plan.Installments {
			if inst.Paid {
				continue
			}
			if inst.DueDate.Format("2006-01-02") == targetDate.Format("2006-01-02") {
				msg := fmt.Sprintf("Reminder: Your installment of %.2f is due on %s. Please pay on time.", inst.Amount, inst.DueDate.Format("2006-01-02"))
				msgUr := fmt.Sprintf("یاد دہانی: آپ کی قسط %.0f روپے مورخہ %s کو واجب الادا ہے۔", inst.Amount, inst.DueDate.Format("2006-01-02"))

				notif := &domain.Notification{
					ID:              "",
					CustomerID:      cust.ID,
					InstallmentPlanID: plan.ID,
					Channel:         "sms",
					MessageEn:       msg,
					MessageUr:       msgUr,
					SentAt:          time.Now(),
					Status:          "pending",
					FineAmount:      0,
					CreatedAt:       time.Now(),
				}
				s.notifRepo.Create(ctx, notif)
				if cust.Phone != "" && s.smsSender != nil {
					s.smsSender.Send(cust.Phone, msg)
				}
			}
		}
	}
	return nil
}

func (s *NotificationService) SendSingleReminder(ctx context.Context, customerID, planID string, installmentNo int) error {
	cust, err := s.custRepo.GetByID(ctx, customerID)
	if err != nil || cust == nil {
		return errors.New("customer not found")
	}
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil || plan == nil {
		return errors.New("plan not found")
	}
	for _, inst := range plan.Installments {
		if inst.InstallmentNo == installmentNo {
			msg := fmt.Sprintf("Payment reminder for installment #%d of %.2f due on %s.", installmentNo, inst.Amount, inst.DueDate.Format("2006-01-02"))
			msgUr := fmt.Sprintf("قسط نمبر %d کی ادائیگی %.0f روپے مورخہ %s کو واجب الادا ہے۔", installmentNo, inst.Amount, inst.DueDate.Format("2006-01-02"))
			notif := &domain.Notification{
				ID:               "",
				CustomerID:       customerID,
				InstallmentPlanID: planID,
				Channel:          "sms",
				MessageEn:        msg,
				MessageUr:        msgUr,
				SentAt:           time.Now(),
				Status:           "sent",
				FineAmount:       0,
				CreatedAt:        time.Now(),
			}
			s.notifRepo.Create(ctx, notif)
			if cust.Phone != "" && s.smsSender != nil {
				s.smsSender.Send(cust.Phone, msg)
			}
			return nil
		}
	}
	return errors.New("installment not found")
}

func (s *NotificationService) SendOverdueReminder(ctx context.Context, customerID, planID string, installmentNo int, fineAmount float64) error {
	cust, err := s.custRepo.GetByID(ctx, customerID)
	if err != nil || cust == nil {
		return errors.New("customer not found")
	}
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil || plan == nil {
		return errors.New("plan not found")
	}
	for _, inst := range plan.Installments {
		if inst.InstallmentNo == installmentNo {
			msg := fmt.Sprintf("Overdue payment: Installment #%d of %.2f. Fine: %.2f. Total due: %.2f.", installmentNo, inst.Amount, fineAmount, inst.Amount+fineAmount)
			msgUr := fmt.Sprintf("ادائیگی واجب: قسط نمبر %d کی رقم %.0f روپے۔ جرمانہ: %.0f روپے۔ کل واجب الادا: %.0f روپے", installmentNo, inst.Amount, fineAmount, inst.Amount+fineAmount)
			notif := &domain.Notification{
				ID:               "",
				CustomerID:       customerID,
				InstallmentPlanID: planID,
				Channel:          "sms",
				MessageEn:        msg,
				MessageUr:        msgUr,
				SentAt:           time.Now(),
				Status:           "sent",
				FineAmount:       fineAmount,
				CreatedAt:        time.Now(),
			}
			s.notifRepo.Create(ctx, notif)
			if cust.Phone != "" && s.smsSender != nil {
				s.smsSender.Send(cust.Phone, msg)
			}
			return nil
		}
	}
	return errors.New("installment not found")
}