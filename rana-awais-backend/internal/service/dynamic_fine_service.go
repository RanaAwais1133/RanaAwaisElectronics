package service

import (
	"math"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
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

// ✅ NEW: Calculate fine with custom fine per day
func (s *DynamicFineService) CalculateWithCustomFine(plan *domain.InstallmentPlan, detail domain.InstallmentDetail, now time.Time, finePerDay float64) float64 {
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
	fine := float64(daysOverdue) * finePerDay
	if fine > detail.Amount*2 {
		fine = detail.Amount * 2
	}
	return math.Round(fine*100) / 100
}

// ✅ NEW: Get fine summary for an installment
func (s *DynamicFineService) GetFineSummary(plan *domain.InstallmentPlan, detail domain.InstallmentDetail, now time.Time) map[string]interface{} {
	fine := s.Calculate(plan, detail, now)
	totalPayable := detail.Amount + fine
	
	return map[string]interface{}{
		"installmentAmount": detail.Amount,
		"fine":              fine,
		"totalPayable":      totalPayable,
		"daysOverdue":       int(now.Sub(detail.DueDate).Hours() / 24),
		"isOverdue":         now.After(detail.DueDate),
	}
}
