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

// Calculate calculates fine based on the plan's FineType
// Supports: "per_day", "fixed", "both", "none"
func (s *DynamicFineService) Calculate(plan *domain.InstallmentPlan, detail domain.InstallmentDetail, now time.Time) float64 {
	if detail.Paid || now.Before(detail.DueDate) {
		return 0
	}

	// Determine fine type (default to "per_day" for backward compatibility)
	fineType := plan.FineType
	if fineType == "" {
		fineType = "per_day"
	}

	switch fineType {
	case "none":
		return 0

	case "fixed":
		graceEnd := detail.DueDate.AddDate(0, 0, plan.GracePeriodDays)
		if now.Before(graceEnd) {
			return 0
		}
		fine := plan.FixedFineAmount
		if fine > detail.Amount*2 {
			fine = detail.Amount * 2
		}
		return math.Round(fine*100) / 100

	case "both":
		graceEnd := detail.DueDate.AddDate(0, 0, plan.GracePeriodDays)
		if now.Before(graceEnd) {
			return 0
		}
		daysOverdue := int(now.Sub(graceEnd).Hours() / 24)
		if daysOverdue <= 0 {
			return 0
		}
		fine := plan.FixedFineAmount + (float64(daysOverdue) * plan.FinePerDay)
		if fine > detail.Amount*2 {
			fine = detail.Amount * 2
		}
		return math.Round(fine*100) / 100

	default: // "per_day"
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
}

// CalculateWithCustomFine calculates fine with a custom fine per day (overrides plan's FinePerDay)
func (s *DynamicFineService) CalculateWithCustomFine(plan *domain.InstallmentPlan, detail domain.InstallmentDetail, now time.Time, finePerDay float64) float64 {
	if detail.Paid || now.Before(detail.DueDate) {
		return 0
	}

	fineType := plan.FineType
	if fineType == "" {
		fineType = "per_day"
	}

	switch fineType {
	case "none":
		return 0

	case "fixed":
		graceEnd := detail.DueDate.AddDate(0, 0, plan.GracePeriodDays)
		if now.Before(graceEnd) {
			return 0
		}
		fine := plan.FixedFineAmount
		if fine > detail.Amount*2 {
			fine = detail.Amount * 2
		}
		return math.Round(fine*100) / 100

	case "both":
		graceEnd := detail.DueDate.AddDate(0, 0, plan.GracePeriodDays)
		if now.Before(graceEnd) {
			return 0
		}
		daysOverdue := int(now.Sub(graceEnd).Hours() / 24)
		if daysOverdue <= 0 {
			return 0
		}
		fine := plan.FixedFineAmount + (float64(daysOverdue) * finePerDay)
		if fine > detail.Amount*2 {
			fine = detail.Amount * 2
		}
		return math.Round(fine*100) / 100

	default: // "per_day"
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
}

// GetFineSummary returns a summary of fine for an installment
func (s *DynamicFineService) GetFineSummary(plan *domain.InstallmentPlan, detail domain.InstallmentDetail, now time.Time) map[string]interface{} {
	fine := s.Calculate(plan, detail, now)
	totalPayable := detail.Amount + fine
	
	summary := map[string]interface{}{
		"installmentAmount": detail.Amount,
		"fine":              fine,
		"totalPayable":      totalPayable,
		"daysOverdue":       int(now.Sub(detail.DueDate).Hours() / 24),
		"isOverdue":         now.After(detail.DueDate),
		"fineType":          plan.FineType,
	}

	// Add breakdown for "both" fine type
	if plan.FineType == "both" {
		graceEnd := detail.DueDate.AddDate(0, 0, plan.GracePeriodDays)
		if now.After(graceEnd) {
			daysOverdue := int(now.Sub(graceEnd).Hours() / 24)
			if daysOverdue > 0 {
				perDayFine := float64(daysOverdue) * plan.FinePerDay
				summary["fixedFine"] = plan.FixedFineAmount
				summary["perDayFine"] = perDayFine
			}
		}
	}

	return summary
}
