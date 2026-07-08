package service

import (
	"context"
	"errors"
	"fmt"

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
	if p.StockCount < 0 {
		return errors.New("stock count cannot be negative")
	}
	return s.repo.Create(ctx, p)
}

func (s *ProductService) GetByID(ctx context.Context, id string) (*domain.Product, error) {
	if id == "" {
		return nil, errors.New("product ID is required")
	}
	return s.repo.GetByID(ctx, id)
}

func (s *ProductService) GetByIDWithStock(ctx context.Context, id string) (*domain.Product, error) {
	if id == "" {
		return nil, errors.New("product ID is required")
	}
	return s.repo.GetByIDWithStock(ctx, id)
}

func (s *ProductService) Update(ctx context.Context, id string, p *domain.Product) error {
	if id == "" {
		return errors.New("product ID is required")
	}
	if p.Name == "" && p.NameUrdu == "" {
		return errors.New("at least one product name is required")
	}
	if p.Price < 0 {
		return errors.New("product price cannot be negative")
	}
	if p.PurchasePrice < 0 {
		return errors.New("purchase price cannot be negative")
	}
	return s.repo.Update(ctx, id, p)
}

func (s *ProductService) Delete(ctx context.Context, id string) error {
	if id == "" {
		return errors.New("product ID is required")
	}
	return s.repo.Delete(ctx, id)
}

func (s *ProductService) List(ctx context.Context, skip, limit int64) ([]domain.Product, error) {
	if skip < 0 {
		skip = 0
	}
	if limit <= 0 || limit > 10000 {
		limit = 10000
	}
	return s.repo.List(ctx, skip, limit)
}

func (s *ProductService) Count(ctx context.Context) (int64, error) {
	return s.repo.Count(ctx)
}

func (s *ProductService) ListByCategory(ctx context.Context, cat string) ([]domain.Product, error) {
	if cat == "" {
		return nil, errors.New("category is required")
	}
	return s.repo.ListByCategory(ctx, cat)
}

// UpdateStock updates the stock count for a product
func (s *ProductService) UpdateStock(ctx context.Context, productID string, quantity int) error {
	if productID == "" {
		return errors.New("product ID is required")
	}
	if quantity < 0 {
		return errors.New("quantity cannot be negative")
	}
	product, err := s.repo.GetByID(ctx, productID)
	if err != nil || product == nil {
		return errors.New("product not found")
	}
	product.StockCount = quantity
	product.InStock = quantity > 0
	return s.repo.Update(ctx, productID, product)
}

// Search performs text search on products
func (s *ProductService) Search(ctx context.Context, query string, skip, limit int64) ([]domain.Product, error) {
	if query == "" {
		return s.List(ctx, skip, limit)
	}
	if skip < 0 {
		skip = 0
	}
	if limit <= 0 || limit > 10000 {
		limit = 10000
	}
	return s.repo.Search(ctx, query, skip, limit)
}

// BulkDelete deletes multiple products
func (s *ProductService) BulkDelete(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return errors.New("no product IDs provided")
	}
	if len(ids) > 100 {
		return fmt.Errorf("cannot delete more than 100 products at once, got %d", len(ids))
	}
	return s.repo.BulkDelete(ctx, ids)
}

// GetLowStock returns products with low stock
func (s *ProductService) GetLowStock(ctx context.Context, threshold int) ([]domain.Product, error) {
	if threshold <= 0 {
		threshold = 5
	}
	return s.repo.GetLowStock(ctx, threshold)
}


