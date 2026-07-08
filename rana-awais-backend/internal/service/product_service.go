package service

import (
	"context"
	"errors"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
)

type ProductService struct {
	repo repository.ProductRepository
}

func NewProductService(repo repository.ProductRepository) *ProductService {
	return &ProductService{repo: repo}
}

func (s *ProductService) Create(ctx context.Context, p *domain.Product) error {
	if p.Name == "" {
		return errors.New("product name is required")
	}
	if p.Price < 0 {
		return errors.New("product price cannot be negative")
	}
	if p.PurchasePrice < 0 {
		return errors.New("purchase price cannot be negative")
	}
	return s.repo.Create(ctx, p)
}

func (s *ProductService) GetByID(ctx context.Context, id string) (*domain.Product, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *ProductService) GetByIDWithStock(ctx context.Context, id string) (*domain.Product, error) {
	return s.repo.GetByIDWithStock(ctx, id)
}

func (s *ProductService) Update(ctx context.Context, id string, p *domain.Product) error {
	return s.repo.Update(ctx, id, p)
}

func (s *ProductService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *ProductService) List(ctx context.Context, skip, limit int64) ([]domain.Product, error) {
	return s.repo.List(ctx, skip, limit)
}

func (s *ProductService) Count(ctx context.Context) (int64, error) {
	return s.repo.Count(ctx)
}

func (s *ProductService) ListByCategory(ctx context.Context, cat string) ([]domain.Product, error) {
	return s.repo.ListByCategory(ctx, cat)
}

// UpdateStock updates the stock count for a product
func (s *ProductService) UpdateStock(ctx context.Context, productID string, quantity int) error {
	product, err := s.repo.GetByID(ctx, productID)
	if err != nil || product == nil {
		return errors.New("product not found")
	}
	product.StockCount = quantity
	product.InStock = quantity > 0
	return s.repo.Update(ctx, productID, product)
}