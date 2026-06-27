package service

import (
	"context"
	"time"

	"github.com/your-org/rana-awais-backend/internal/domain"
	"github.com/your-org/rana-awais-backend/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PaymentService struct {
	paymentRepo repository.PaymentRepository
}

func NewPaymentService(paymentRepo repository.PaymentRepository) *PaymentService {
	return &PaymentService{paymentRepo: paymentRepo}
}

func (s *PaymentService) GetPaymentsByPlan(ctx context.Context, planID primitive.ObjectID) ([]domain.Payment, error) {
	return s.paymentRepo.ListByPlan(ctx, planID)
}

// ✅ NEW: Get today's payments
func (s *PaymentService) GetTodayPayments(ctx context.Context) ([]domain.Payment, error) {
	return s.paymentRepo.GetTodayPayments(ctx)
}

// ✅ NEW: Get monthly payments
func (s *PaymentService) GetMonthlyPayments(ctx context.Context, year int, month time.Month) ([]domain.Payment, error) {
	return s.paymentRepo.GetMonthlyPayments(ctx, year, month)
}

// ✅ NEW: Get payments by date range
func (s *PaymentService) GetPaymentsByDateRange(ctx context.Context, start, end time.Time) ([]domain.Payment, error) {
	return s.paymentRepo.GetPaymentsByDateRange(ctx, start, end)
}

// ✅ NEW: Calculate total payments for today
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