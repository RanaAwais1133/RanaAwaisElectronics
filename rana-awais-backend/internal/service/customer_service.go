package service

import (
	"context"
	"errors"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
)

type CustomerService struct {
	custRepo repository.CustomerRepository
}

func NewCustomerService(custRepo repository.CustomerRepository) *CustomerService {
	return &CustomerService{custRepo: custRepo}
}

func (s *CustomerService) Create(ctx context.Context, c *domain.Customer) error {
	existing, _ := s.custRepo.GetByPhone(ctx, c.Phone)
	if existing != nil {
		return errors.New("customer with this phone already exists")
	}
	return s.custRepo.Create(ctx, c)
}

func (s *CustomerService) GetByID(ctx context.Context, id string) (*domain.Customer, error) {
	return s.custRepo.GetByID(ctx, id)
}

func (s *CustomerService) List(ctx context.Context, skip, limit int64) ([]domain.Customer, error) {
	return s.custRepo.List(ctx, skip, limit)
}

func (s *CustomerService) Update(ctx context.Context, id string, c *domain.Customer) error {
	return s.custRepo.Update(ctx, id, c)
}

func (s *CustomerService) Delete(ctx context.Context, id string) error {
	return s.custRepo.Delete(ctx, id)
}

func (s *CustomerService) GetByPhone(ctx context.Context, phone string) (*domain.Customer, error) {
	return s.custRepo.GetByPhone(ctx, phone)
}

func (s *CustomerService) Count(ctx context.Context) (int64, error) {
	return s.custRepo.Count(ctx)
}

func (s *CustomerService) Search(ctx context.Context, query string, skip, limit int64) ([]domain.Customer, error) {
	return s.custRepo.Search(ctx, query, skip, limit)
}

// Get customer with full details including guarantors
func (s *CustomerService) GetByIDWithDetails(ctx context.Context, id string) (*domain.Customer, error) {
	return s.custRepo.GetByID(ctx, id)
}