package service

import (
	"context"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
)

type PaymentService struct {
	paymentRepo repository.PaymentRepository
}

func NewPaymentService(paymentRepo repository.PaymentRepository) *PaymentService {
	return &PaymentService{paymentRepo: paymentRepo}
}

func (s *PaymentService) GetPaymentsByPlan(ctx context.Context, planID string) ([]domain.Payment, error) {
	return s.paymentRepo.ListByPlan(ctx, planID)
}

func (s *PaymentService) ListAll(ctx context.Context, skip, limit int64) ([]domain.Payment, error) {
	return s.paymentRepo.ListAll(ctx, skip, limit)
}


func (s *PaymentService) GetTodayPayments(ctx context.Context) ([]domain.Payment, error) {
	return s.paymentRepo.GetTodayPayments(ctx)
}

func (s *PaymentService) GetMonthlyPayments(ctx context.Context, year int, month time.Month) ([]domain.Payment, error) {
	return s.paymentRepo.GetMonthlyPayments(ctx, year, month)
}

func (s *PaymentService) GetPaymentsByDateRange(ctx context.Context, start, end time.Time) ([]domain.Payment, error) {
	return s.paymentRepo.GetPaymentsByDateRange(ctx, start, end)
}

func (s *PaymentService) GetTodayTotal(ctx context.Context) (float64, error) {
	payments, err := s.paymentRepo.GetTodayPayments(ctx)
	if err != nil {
		return 0, err
	}
	total := 0.0
	for _, p := range payments {
		total += p.Amount
	}
	return total, nil
}