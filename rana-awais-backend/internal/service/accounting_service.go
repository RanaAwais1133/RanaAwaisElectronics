package service

import (
	"context"
	"time"

	"github.com/your-org/rana-awais-backend/internal/repository"
)

type AccountingService struct {
	accRepo  repository.AccountingRepository
	prodRepo repository.ProductRepository
}

func NewAccountingService(accRepo repository.AccountingRepository, prodRepo repository.ProductRepository) *AccountingService {
	return &AccountingService{accRepo: accRepo, prodRepo: prodRepo}
}

// GetRevenueAndProfit returns total revenue and net profit for the given date range.
func (s *AccountingService) GetRevenueAndProfit(ctx context.Context, start, end time.Time) (float64, float64, error) {
	entries, err := s.accRepo.GetCashFlowReport(ctx, start, end)
	if err != nil {
		return 0, 0, err
	}
	revenue := 0.0
	cost := 0.0
	for _, e := range entries {
		if e.Type == "income" {
			revenue += e.Amount
		} else if e.Type == "expense" {
			cost += e.Amount
		}
	}
	profit := revenue - cost
	return revenue, profit, nil
}

func (s *AccountingService) GetProfitLossCashFlow(ctx context.Context, start, end time.Time) (float64, error) {
	_, profit, err := s.GetRevenueAndProfit(ctx, start, end)
	return profit, err
}

func (s *AccountingService) GetProfitLossAccrual(ctx context.Context, start, end time.Time) (float64, error) {
	entries, err := s.accRepo.GetAccrualReport(ctx, start, end)
	if err != nil {
		return 0, err
	}
	sum := 0.0
	for _, e := range entries {
		if e.Type == "income" {
			sum += e.Amount
		} else {
			sum -= e.Amount
		}
	}
	return sum, nil
}

// GetProfitWithCost returns profit considering purchase price (revenue - cost)
func (s *AccountingService) GetProfitWithCost(ctx context.Context, start, end time.Time) (map[string]float64, error) {
	entries, err := s.accRepo.GetCashFlowReport(ctx, start, end)
	if err != nil {
		return nil, err
	}

	totalRevenue := 0.0
	totalCost := 0.0

	for _, e := range entries {
		if e.Type == "income" {
			totalRevenue += e.Amount
		} else if e.Type == "expense" {
			totalCost += e.Amount
		}
	}

	// Also add cost of goods sold from inventory
	items, err := s.accRepo.GetSoldItems(ctx, start, end)
	if err == nil {
		for _, item := range items {
			totalCost += item.PurchasePrice
		}
	}

	return map[string]float64{
		"total_revenue": totalRevenue,
		"total_cost":    totalCost,
		"net_profit":    totalRevenue - totalCost,
	}, nil
}