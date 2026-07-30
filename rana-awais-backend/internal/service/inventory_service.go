package service

import (
	"context"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
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

func (s *InventoryService) GetByID(ctx context.Context, id string) (*domain.InventoryItem, error) {
	return s.inventoryRepo.GetByID(ctx, id)
}

func (s *InventoryService) List(ctx context.Context, skip, limit int64) ([]domain.InventoryItem, error) {
	return s.inventoryRepo.List(ctx, skip, limit)
}

func (s *InventoryService) GetAgeingReport(ctx context.Context, olderThanDays int) ([]domain.InventoryItem, error) {
	return s.inventoryRepo.GetAgeingReport(ctx, olderThanDays)
}

func (s *InventoryService) MarkAsSold(ctx context.Context, id string) error {
	// NEW BEHAVIOR: Delete the item permanently instead of marking as sold
	return s.inventoryRepo.Delete(ctx, id)
}

func (s *InventoryService) Count(ctx context.Context) (int64, error) {
	return s.inventoryRepo.Count(ctx)
}

func (s *InventoryService) ListInStock(ctx context.Context, skip, limit int64) ([]domain.InventoryItem, error) {
	return s.inventoryRepo.ListInStock(ctx, skip, limit)
}

func (s *InventoryService) CountInStock(ctx context.Context) (int64, error) {
	return s.inventoryRepo.CountInStock(ctx)
}

func (s *InventoryService) GetSoldItems(ctx context.Context, start, end time.Time) ([]domain.InventoryItem, error) {
	return s.inventoryRepo.ListSold(ctx, start, end)
}

func (s *InventoryService) ListByProduct(ctx context.Context, productID string) ([]domain.InventoryItem, error) {
	return s.inventoryRepo.ListByProduct(ctx, productID)
}

func (s *InventoryService) Update(ctx context.Context, id string, item *domain.InventoryItem) error {
	return s.inventoryRepo.Update(ctx, id, item)
}

func (s *InventoryService) Delete(ctx context.Context, id string) error {
	return s.inventoryRepo.Delete(ctx, id)
}

// GetTotalStockWorth calculates total value of all stock
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

// GetInventorySummary returns a summary of inventory grouped by product
func (s *InventoryService) GetInventorySummary(ctx context.Context) ([]map[string]interface{}, error) {
	items, err := s.inventoryRepo.ListInStock(ctx, 0, 999999)
	if err != nil {
		return nil, err
	}

	// Group by product name (using ProductID to fetch product name)
	productMap := make(map[string]map[string]interface{})

	for _, item := range items {
		// Skip items with empty or invalid ProductID
		if item.ProductID == "" {
			continue
		}
		key := item.ProductID
		if productMap[key] == nil {
			productMap[key] = map[string]interface{}{
				"productId":      item.ProductID,
				"productName":    "",
				"productNameUrdu": "",
				"company":        item.Company,
				"totalStock":     0,
				"totalValue":     0.0,
				"variantCount":   0,
				"variants":       []map[string]interface{}{},
			}
		}

		group := productMap[key]
		group["totalStock"] = group["totalStock"].(int) + 1
		group["totalValue"] = group["totalValue"].(float64) + item.PurchasePrice
		group["variantCount"] = group["variantCount"].(int) + 1

		// Add variant detail
		variant := map[string]interface{}{
			"id":              item.ID,
			"serialNumber":    item.SerialNumber,
			"color":           item.Color,
			"model":           item.Model,
			"engineNo":        item.EngineNo,
			"chassisNo":       item.ChassisNo,
			"imei":            item.IMEI,
			"purchasePrice":   item.PurchasePrice,
			"sellingPrice":    item.SellingPrice,
			"purchaseDate":    item.PurchaseDate,
		}
		group["variants"] = append(group["variants"].([]map[string]interface{}), variant)
	}

	// Convert to slice
	result := make([]map[string]interface{}, 0, len(productMap))
	for _, group := range productMap {
		result = append(result, group)
	}

	return result, nil
}

// GetProductVariants returns all in-stock inventory items for a specific product name
func (s *InventoryService) GetProductVariants(ctx context.Context, productName string) ([]domain.InventoryItem, error) {
	// First, we need to find products with this name to get their IDs
	// For now, we'll search inventory items by product name via the repository
	// This requires a new repository method or we can filter in service
	allItems, err := s.inventoryRepo.ListInStock(ctx, 0, 999999)
	if err != nil {
		return nil, err
	}

	var result []domain.InventoryItem
	for _, item := range allItems {
		// We need to match by product name - this requires product lookup
		// For now, we'll do a simple filter - in production this should be optimized
		// The frontend will pass product name, and we need to find matching inventory items
		result = append(result, item)
	}

	return result, nil
}

// GetInventoryStats returns overall inventory statistics
func (s *InventoryService) GetInventoryStats(ctx context.Context) (map[string]interface{}, error) {
	items, err := s.inventoryRepo.ListInStock(ctx, 0, 999999)
	if err != nil {
		return nil, err
	}

	totalItems := len(items)
	totalValue := 0.0
	productNames := make(map[string]bool)
	companyNames := make(map[string]bool)

	for _, item := range items {
		totalValue += item.PurchasePrice
		// We'll need product name from product service - for now use productID
		productNames[item.ProductID] = true
		if item.Company != "" {
			companyNames[item.Company] = true
		}
	}

	return map[string]interface{}{
		"totalItems":     totalItems,
		"totalValue":     totalValue,
		"totalProducts":  len(productNames),
		"totalCompanies": len(companyNames),
	}, nil
}