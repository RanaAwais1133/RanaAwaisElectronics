package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
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
			dueDate := inst.DueDate.Truncate(24 * time.Hour)
			if dueDate.Equal(targetDate.Truncate(24 * time.Hour)) {
				msgEn := fmt.Sprintf("Dear %s, your installment #%d of Rs.%.2f is due on %s. Please pay on time to avoid fine.", cust.Name, inst.InstallmentNo, inst.Amount, inst.DueDate.Format("02-Jan-2006"))
				msgUr := fmt.Sprintf("محترم %s، آپ کی قسط نمبر %d بمبلغ %.2f روپے %s کو واجب الادا ہے۔ برائے مہربانی بروقت ادائیگی کریں۔", cust.NameUrdu, inst.InstallmentNo, inst.Amount, inst.DueDate.Format("02-Jan-2006"))

				var channel string
				if s.waSender != nil {
					if err := s.waSender.Send(cust.Phone, msgUr); err == nil {
						channel = "whatsapp"
					}
				}
				if channel == "" && s.smsSender != nil {
					if err := s.smsSender.Send(cust.Phone, msgUr); err == nil {
						channel = "sms"
					}
				}
				notif := &domain.Notification{
					CustomerID:        cust.ID,
					InstallmentPlanID: plan.ID,
					Channel:           channel,
					MessageEn:         msgEn,
					MessageUr:         msgUr,
					SentAt:            time.Now(),
					Status:            "sent",
				}
				if channel == "" {
					notif.Status = "failed"
				}
				s.notifRepo.Create(ctx, notif)
			}
		}
	}
	return nil
}

func (s *NotificationService) SendSingleReminder(ctx context.Context, customerID, planID primitive.ObjectID, installmentNo int) error {
	cust, err := s.custRepo.GetByID(ctx, customerID)
	if err != nil || cust == nil {
		return errors.New("customer not found")
	}
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil || plan == nil {
		return errors.New("plan not found")
	}
	var target *domain.InstallmentDetail
	for i := range plan.Installments {
		if plan.Installments[i].InstallmentNo == installmentNo {
			target = &plan.Installments[i]
			break
		}
	}
	if target == nil {
		return errors.New("installment not found")
	}

	msgEn := fmt.Sprintf("Dear %s, your installment #%d of Rs.%.2f is due on %s. Please pay on time to avoid fine.", cust.Name, target.InstallmentNo, target.Amount, target.DueDate.Format("02-Jan-2006"))
	msgUr := fmt.Sprintf("محترم %s، آپ کی قسط نمبر %d بمبلغ %.2f روپے %s کو واجب الادا ہے۔ برائے مہربانی بروقت ادائیگی کریں۔", cust.NameUrdu, target.InstallmentNo, target.Amount, target.DueDate.Format("02-Jan-2006"))

	var channel string
	if s.waSender != nil {
		if err := s.waSender.Send(cust.Phone, msgUr); err == nil {
			channel = "whatsapp"
		}
	}
	if channel == "" && s.smsSender != nil {
		if err := s.smsSender.Send(cust.Phone, msgUr); err == nil {
			channel = "sms"
		}
	}
	notif := &domain.Notification{
		CustomerID:        cust.ID,
		InstallmentPlanID: plan.ID,
		Channel:           channel,
		MessageEn:         msgEn,
		MessageUr:         msgUr,
		SentAt:            time.Now(),
		Status:            "sent",
	}
	if channel == "" {
		notif.Status = "failed"
	}
	return s.notifRepo.Create(ctx, notif)
}

// ✅ NEW: SendOverdueReminder for late payments with fine
func (s *NotificationService) SendOverdueReminder(ctx context.Context, customerID, planID primitive.ObjectID, installmentNo int, fineAmount float64) error {
	cust, err := s.custRepo.GetByID(ctx, customerID)
	if err != nil || cust == nil {
		return errors.New("customer not found")
	}
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil || plan == nil {
		return errors.New("plan not found")
	}
	var target *domain.InstallmentDetail
	for i := range plan.Installments {
		if plan.Installments[i].InstallmentNo == installmentNo {
			target = &plan.Installments[i]
			break
		}
	}
	if target == nil {
		return errors.New("installment not found")
	}

	totalPayable := target.Amount + fineAmount

	msgEn := fmt.Sprintf("Dear %s, your installment #%d of Rs.%.2f is overdue. Fine of Rs.%.2f has been added. Total payable: Rs.%.2f. Please pay immediately to avoid additional charges.", 
		cust.Name, target.InstallmentNo, target.Amount, fineAmount, totalPayable)
	msgUr := fmt.Sprintf("محترم %s، آپ کی قسط نمبر %d بمبلغ %.2f روپے واجب الادا ہو چکی ہے۔ %.2f روپے جرمانہ شامل کر دیا گیا ہے۔ کل قابل ادائیگی: %.2f روپے۔ برائے مہربانی فوری ادائیگی کریں۔", 
		cust.NameUrdu, target.InstallmentNo, target.Amount, fineAmount, totalPayable)

	var channel string
	if s.waSender != nil {
		if err := s.waSender.Send(cust.Phone, msgUr); err == nil {
			channel = "whatsapp"
		}
	}
	if channel == "" && s.smsSender != nil {
		if err := s.smsSender.Send(cust.Phone, msgUr); err == nil {
			channel = "sms"
		}
	}
	notif := &domain.Notification{
		CustomerID:        cust.ID,
		InstallmentPlanID: plan.ID,
		Channel:           channel,
		MessageEn:         msgEn,
		MessageUr:         msgUr,
		SentAt:            time.Now(),
		Status:            "sent",
		FineAmount:        fineAmount,
	}
	if channel == "" {
		notif.Status = "failed"
	}
	return s.notifRepo.Create(ctx, notif)
}
