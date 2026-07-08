package service

import (
	"context"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
)

// ExpenseService handles business logic for expenses
type ExpenseService struct {
	repo repository.ExpenseRepository
}

// NewExpenseService creates a new expense service
func NewExpenseService(repo repository.ExpenseRepository) *ExpenseService {
	return &ExpenseService{repo: repo}
}

// Create creates a new expense
func (s *ExpenseService) Create(ctx context.Context, e *domain.Expense) error {
	return s.repo.Create(ctx, e)
}

// GetByID retrieves an expense by ID
func (s *ExpenseService) GetByID(ctx context.Context, id string) (*domain.Expense, error) {
	return s.repo.GetByID(ctx, id)
}

// Update updates an existing expense
func (s *ExpenseService) Update(ctx context.Context, id string, e *domain.Expense) error {
	return s.repo.Update(ctx, id, e)
}

// Delete removes an expense
func (s *ExpenseService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

// List returns expenses with pagination
func (s *ExpenseService) List(ctx context.Context, skip, limit int64) ([]domain.Expense, error) {
	return s.repo.List(ctx, skip, limit)
}

// Count returns total number of expenses
func (s *ExpenseService) Count(ctx context.Context) (int64, error) {
	return s.repo.Count(ctx)
}
