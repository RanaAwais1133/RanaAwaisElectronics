package service

import (
	"math"
	"time"

	"github.com/your-org/rana-awais-backend/internal/domain"
)

type DynamicFineService struct{}

func NewDynamicFineService() *DynamicFineService {
	return &DynamicFineService{}
}

func (s *DynamicFineService) Calculate(plan *domain.InstallmentPlan, detail domain.InstallmentDetail, now time.Time) float64 {
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
