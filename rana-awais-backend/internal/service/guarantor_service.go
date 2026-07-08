package service

import (
	"context"
	"errors"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
)

type GuarantorService struct {
	guarRepo repository.GuarantorRepository
	custRepo repository.CustomerRepository
}

func NewGuarantorService(guarRepo repository.GuarantorRepository, custRepo repository.CustomerRepository) *GuarantorService {
	return &GuarantorService{guarRepo: guarRepo, custRepo: custRepo}
}

// Create creates a guarantor, attaches it to the customer, and sets default verification status if empty.
func (s *GuarantorService) Create(ctx context.Context, g *domain.Guarantor) error {
	if g.CustomerID == "" {
		return errors.New("customer id is required")
	}
	if g.VerificationStatus == "" {
		g.VerificationStatus = "pending"
	}

	cust, err := s.custRepo.GetByID(ctx, g.CustomerID)
	if err != nil || cust == nil {
		return errors.New("customer not found")
	}

	if err := s.guarRepo.Create(ctx, g); err != nil {
		return err
	}

	cust.GuarantorIDs = append(cust.GuarantorIDs, g.ID)
	if err := s.custRepo.Update(ctx, cust.ID, cust); err != nil {
		return err
	}

	return nil
}

func (s *GuarantorService) GetByID(ctx context.Context, id string) (*domain.Guarantor, error) {
	return s.guarRepo.GetByID(ctx, id)
}

func (s *GuarantorService) List(ctx context.Context, skip, limit int64) ([]domain.Guarantor, error) {
	return s.guarRepo.List(ctx, skip, limit)
}

func (s *GuarantorService) Count(ctx context.Context) (int64, error) {
	return s.guarRepo.Count(ctx)
}

func (s *GuarantorService) ListByCustomer(ctx context.Context, customerID string) ([]domain.Guarantor, error) {
	return s.guarRepo.ListByCustomer(ctx, customerID)
}

// ✅ NEW: ListByCustomerIDs - Fetch guarantors for multiple customers at once
func (s *GuarantorService) ListByCustomerIDs(ctx context.Context, customerIDs []string) ([]domain.Guarantor, error) {
	return s.guarRepo.ListByCustomerIDs(ctx, customerIDs)
}

func (s *GuarantorService) Update(ctx context.Context, id string, g *domain.Guarantor) error {
	return s.guarRepo.Update(ctx, id, g)
}

func (s *GuarantorService) Delete(ctx context.Context, id string) error {
	g, err := s.guarRepo.GetByID(ctx, id)
	if err != nil || g == nil {
		return errors.New("guarantor not found")
	}

	if g.CustomerID != "" {
		cust, err := s.custRepo.GetByID(ctx, g.CustomerID)
		if err == nil && cust != nil {
			newGuarantorIDs := make([]string, 0)
			for _, gid := range cust.GuarantorIDs {
				if gid != id {
					newGuarantorIDs = append(newGuarantorIDs, gid)
				}
			}
			cust.GuarantorIDs = newGuarantorIDs
			s.custRepo.Update(ctx, cust.ID, cust)
		}
	}

	return s.guarRepo.Delete(ctx, id)
}

// Verify changes the verification status of a guarantor.
func (s *GuarantorService) Verify(ctx context.Context, id string, status string) error {
	g, err := s.guarRepo.GetByID(ctx, id)
	if err != nil || g == nil {
		return errors.New("guarantor not found")
	}
	g.VerificationStatus = status
	return s.guarRepo.Update(ctx, id, g)
}

// GetVerifiedCount gets the count of verified guarantors for a customer
func (s *GuarantorService) GetVerifiedCount(ctx context.Context, customerID string) (int, error) {
	guarantors, err := s.guarRepo.ListByCustomer(ctx, customerID)
	if err != nil {
		return 0, err
	}
	verified := 0
	for _, g := range guarantors {
		if g.VerificationStatus == "verified" {
			verified++
		}
	}
	return verified, nil
}