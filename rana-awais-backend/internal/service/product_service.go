package service

import (
	"context"
	"errors"

	"github.com/your-org/rana-awais-backend/internal/domain"
	"github.com/your-org/rana-awais-backend/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
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

func (s *ProductService) GetByID(ctx context.Context, id primitive.ObjectID) (*domain.Product, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *ProductService) GetByIDWithStock(ctx context.Context, id primitive.ObjectID) (*domain.Product, error) {
	return s.repo.GetByIDWithStock(ctx, id)
}

func (s *ProductService) Update(ctx context.Context, id primitive.ObjectID, p *domain.Product) error {
	return s.repo.Update(ctx, id, p)
}

func (s *ProductService) Delete(ctx context.Context, id primitive.ObjectID) error {
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
