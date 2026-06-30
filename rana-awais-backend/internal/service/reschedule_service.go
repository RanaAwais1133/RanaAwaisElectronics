package service

import (
	"context"
	"errors"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type RescheduleService struct {
	planRepo repository.InstallmentRepository
}

func NewRescheduleService(planRepo repository.InstallmentRepository) *RescheduleService {
	return &RescheduleService{planRepo: planRepo}
}

func (s *RescheduleService) CheckAndReschedule(ctx context.Context, planID primitive.ObjectID) error {
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil || plan == nil {
		return errors.New("plan not found")
	}
	now := time.Now()
	skipped := 0
	for _, inst := range plan.Installments {
		if !inst.Paid && inst.DueDate.AddDate(0, 0, plan.GracePeriodDays).Before(now) {
			skipped++
		}
	}
	if skipped >= 3 {
		plan.Status = "defaulted"
		s.planRepo.Update(ctx, planID, plan)

		newPlan := *plan
		newPlan.ID = primitive.NilObjectID
		newPlan.StartDate = now
		newPlan.EndDate = plan.EndDate.AddDate(0, 2, 0)
		newPlan.NumberOfInstallments = plan.NumberOfInstallments + 2
		newPlan.RemainingAmount = newPlan.TotalAmount - newPlan.DownPayment - newPlan.AdvanceAmount
		newPlan.Installments = nil
		newPlan.Status = "active"
		return s.planRepo.Create(ctx, &newPlan)
	}
	return nil
}

// ✅ NEW: Get reschedule options for a plan
func (s *RescheduleService) GetRescheduleOptions(ctx context.Context, planID primitive.ObjectID) (map[string]interface{}, error) {
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil || plan == nil {
		return nil, errors.New("plan not found")
	}
	
	// Calculate remaining balance
	remainingBalance := 0.0
	paidCount := 0
	totalCount := len(plan.Installments)
	
	for _, inst := range plan.Installments {
		if !inst.Paid {
			remainingBalance += inst.Amount - inst.PartialPaid
		} else {
			paidCount++
		}
	}
	
	return map[string]interface{}{
		"planId":           planID.Hex(),
		"remainingBalance": remainingBalance,
		"paidCount":        paidCount,
		"totalCount":       totalCount,
		"remainingCount":   totalCount - paidCount,
		"currentStatus":    plan.Status,
		"options": []string{
			"continue", // Continue with same schedule
			"new",      // New schedule with remaining balance
		},
	}, nil
}
