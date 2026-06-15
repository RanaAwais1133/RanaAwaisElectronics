package service

import (
	"context"
	"errors"
	"time"

	"github.com/your-org/rana-awais-backend/internal/domain"
	"github.com/your-org/rana-awais-backend/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type InventoryService struct {
	inventoryRepo repository.InventoryRepository
}

func NewInventoryService(inventoryRepo repository.InventoryRepository) *InventoryService {
	return &InventoryService{inventoryRepo: inventoryRepo}
}

// Create adds a single inventory item.
func (s *InventoryService) Create(ctx context.Context, item *domain.InventoryItem) error {
	return s.inventoryRepo.Create(ctx, item)
}

// GetByID returns a single inventory item by its ID.
func (s *InventoryService) GetByID(ctx context.Context, id primitive.ObjectID) (*domain.InventoryItem, error) {
	return s.inventoryRepo.GetByID(ctx, id)
}

// List returns inventory items with pagination.
func (s *InventoryService) List(ctx context.Context, skip, limit int64) ([]domain.InventoryItem, error) {
	return s.inventoryRepo.List(ctx, skip, limit)
}

// GetAgeingReport returns items that have been in stock for too long.
func (s *InventoryService) GetAgeingReport(ctx context.Context, olderThanDays int) ([]domain.InventoryItem, error) {
	return s.inventoryRepo.GetAgeingReport(ctx, olderThanDays)
}

// MarkAsSold marks an inventory item as sold.
func (s *InventoryService) MarkAsSold(ctx context.Context, id primitive.ObjectID) error {
	item, err := s.inventoryRepo.GetByID(ctx, id)
	if err != nil || item == nil {
		return errors.New("item not found")
	}
	now := time.Now()
	item.Status = "sold"
	item.SoldDate = &now
	return s.inventoryRepo.Update(ctx, id, item)
}

// ListByProduct returns all inventory items for a given product.
func (s *InventoryService) Count(ctx context.Context) (int64, error) {
	return s.inventoryRepo.Count(ctx)
}

func (s *InventoryService) ListByProduct(ctx context.Context, productID primitive.ObjectID) ([]domain.InventoryItem, error) {
	return s.inventoryRepo.ListByProduct(ctx, productID)
}

// Update modifies an existing inventory item.
func (s *InventoryService) Update(ctx context.Context, id primitive.ObjectID, item *domain.InventoryItem) error {
	return s.inventoryRepo.Update(ctx, id, item)
}

// Delete removes an inventory item.
func (s *InventoryService) Delete(ctx context.Context, id primitive.ObjectID) error {
	return s.inventoryRepo.Delete(ctx, id)
}