package service

import (
	"context"

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
