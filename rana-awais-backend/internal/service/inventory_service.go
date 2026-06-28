package service

import (
	"context"
	"errors"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type InventoryService struct {
	inventoryRepo repository.InventoryRepository
}

func NewInventoryService(inventoryRepo repository.InventoryRepository) *InventoryService {
	return &InventoryService{inventoryRepo: inventoryRepo}
}

func (s *InventoryService) Create(ctx context.Context, item *domain.InventoryItem) error {
	return s.inventoryRepo.Create(ctx, item)
}

func (s *InventoryService) GetByID(ctx context.Context, id primitive.ObjectID) (*domain.InventoryItem, error) {
	return s.inventoryRepo.GetByID(ctx, id)
}

func (s *InventoryService) List(ctx context.Context, skip, limit int64) ([]domain.InventoryItem, error) {
	return s.inventoryRepo.List(ctx, skip, limit)
}

func (s *InventoryService) GetAgeingReport(ctx context.Context, olderThanDays int) ([]domain.InventoryItem, error) {
	return s.inventoryRepo.GetAgeingReport(ctx, olderThanDays)
}

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

func (s *InventoryService) Count(ctx context.Context) (int64, error) {
	return s.inventoryRepo.Count(ctx)
}

func (s *InventoryService) ListByProduct(ctx context.Context, productID primitive.ObjectID) ([]domain.InventoryItem, error) {
	return s.inventoryRepo.ListByProduct(ctx, productID)
}

func (s *InventoryService) Update(ctx context.Context, id primitive.ObjectID, item *domain.InventoryItem) error {
	return s.inventoryRepo.Update(ctx, id, item)
}

func (s *InventoryService) Delete(ctx context.Context, id primitive.ObjectID) error {
	return s.inventoryRepo.Delete(ctx, id)
}

// ✅ NEW: GetTotalStockWorth - Total value of all stock
func (s *InventoryService) GetTotalStockWorth(ctx context.Context) (float64, error) {
	items, err := s.inventoryRepo.List(ctx, 0, 999999)
	if err != nil {
		return 0, err
	}
	total := 0.0
	for _, item := range items {
		if item.Status == "in_stock" {
			total += item.PurchasePrice
		}
	}
	return total, nil
}

// ✅ NEW: GetInventorySummary
func (s *InventoryService) GetInventorySummary(ctx context.Context) (map[string]interface{}, error) {
	items, err := s.inventoryRepo.List(ctx, 0, 999999)
	if err != nil {
		return nil, err
	}

	inStock := 0
	sold := 0
	returned := 0
	totalWorth := 0.0

	for _, item := range items {
		switch item.Status {
		case "in_stock":
			inStock++
			totalWorth += item.PurchasePrice
		case "sold":
			sold++
		case "returned":
			returned++
		}
	}

	return map[string]interface{}{
		"inStock":    inStock,
		"sold":       sold,
		"returned":   returned,
		"totalWorth": totalWorth,
		"totalItems": len(items),
	}, nil
}
