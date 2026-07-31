package handler

import (
	"net/http"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// ProductGroup represents a grouped product with aggregated stock and value
type ProductGroup struct {
	Name        string  `json:"name" bson:"_id"`
	NameUrdu    string  `json:"nameUrdu" bson:"nameurdu"`
	Company     string  `json:"company" bson:"company"`
	Category    string  `json:"category" bson:"category"`
	TotalStock  int     `json:"totalStock" bson:"totalstock"`
	AvgPrice    float64 `json:"avgPrice" bson:"avgprice"`
	TotalValue  float64 `json:"totalValue" bson:"totalvalue"`
	VariantCount int    `json:"variantCount" bson:"variantcount"`
}

// ProductGroupsHandler handles product groups requests
type ProductGroupsHandler struct{}

func NewProductGroupsHandler() *ProductGroupsHandler {
	return &ProductGroupsHandler{}
}

// NOTE: getDB() and ctx() are already defined in dashboard_handler.go
// Do NOT redeclare them here.
// GetProductGroups returns all product groups with REAL-TIME stock and value from inventory_items
// GET /api/dashboard/product-groups
func (h *ProductGroupsHandler) GetProductGroups(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"error":    "Database not connected",
			"error_ur": "ڈیٹا بیس منسلک نہیں",
		})
		return
	}

	// Get low stock filter from query params
	lowStockOnly := r.URL.Query().Get("low_stock") == "true"

	// ✅ NEW: Aggregate from inventory_items (SINGLE SOURCE OF TRUTH)
	// Group by product name via $lookup to products collection
	groupPipe := mongo.Pipeline{
		// Filter only in_stock items
		{{Key: "$match", Value: bson.D{{Key: "status", Value: "in_stock"}}}},
		// Lookup product name from products collection
		{{Key: "$lookup", Value: bson.D{
			{Key: "from", Value: "products"},
			{Key: "localField", Value: "productid"},
			{Key: "foreignField", Value: "_id"},
			{Key: "as", Value: "product"},
		}}},
		// Unwind the product array (keep items even without product match)
		{{Key: "$unwind", Value: bson.D{{Key: "path", Value: "$product"}, {Key: "preserveNullAndEmptyArrays", Value: true}}}},
		// Group by product name (use company as fallback for orphaned items)
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$product.name", "$company"}}}},
			{Key: "name", Value: bson.D{{Key: "$first", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$product.name", "$company"}}}}}},
			{Key: "nameurdu", Value: bson.D{{Key: "$first", Value: "$product.nameurdu"}}},
			{Key: "company", Value: bson.D{{Key: "$first", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$product.company", "$company"}}}}}},
			{Key: "category", Value: bson.D{{Key: "$first", Value: "$product.category"}}},
			{Key: "totalstock", Value: bson.D{{Key: "$sum", Value: 1}}},
			{Key: "totalvalue", Value: bson.D{{Key: "$sum", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$purchaseprice", 0}}}}}},
			{Key: "avgprice", Value: bson.D{{Key: "$avg", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$sellingprice", 0}}}}}},
			{Key: "variantcount", Value: bson.D{{Key: "$sum", Value: 1}}},
		}}},
		// Filter out empty groups
		{{Key: "$match", Value: bson.D{{Key: "_id", Value: bson.D{{Key: "$ne", Value: ""}}}}}},
		// Sort by name
		{{Key: "$sort", Value: bson.D{{Key: "_id", Value: 1}}}},
	}

	groupCursor, groupErr := db.Collection("inventory_items").Aggregate(ctx(), groupPipe)
	var productGroups []ProductGroup
	if groupErr == nil {
		for groupCursor.Next(ctx()) {
			var pg ProductGroup
			if groupCursor.Decode(&pg) == nil {
				// Apply low stock filter if requested
				if lowStockOnly && pg.TotalStock > 5 {
					continue
				}
				productGroups = append(productGroups, pg)
			}
		}
		groupCursor.Close(ctx())
	}
	if productGroups == nil {
		productGroups = []ProductGroup{}
	}

	// Calculate totals
	totalStock := 0
	totalValue := 0.0
	for _, pg := range productGroups {
		totalStock += pg.TotalStock
		totalValue += pg.TotalValue
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"productGroups": productGroups,
		"totalStock":    totalStock,
		"totalValue":    totalValue,
		"count":         len(productGroups),
	})
}

// GetLowStockProducts returns products with stock <= 5 from REAL inventory_items
// GET /api/dashboard/low-stock-products
func (h *ProductGroupsHandler) GetLowStockProducts(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"error":    "Database not connected",
			"error_ur": "ڈیٹا بیس منسلک نہیں",
		})
		return
	}

	// ✅ NEW: Aggregate from inventory_items (SINGLE SOURCE OF TRUTH)
	groupPipe := mongo.Pipeline{
		// Filter only in_stock items
		{{Key: "$match", Value: bson.D{{Key: "status", Value: "in_stock"}}}},
		// Lookup product name
		{{Key: "$lookup", Value: bson.D{
			{Key: "from", Value: "products"},
			{Key: "localField", Value: "productid"},
			{Key: "foreignField", Value: "_id"},
			{Key: "as", Value: "product"},
		}}},
		{{Key: "$unwind", Value: bson.D{{Key: "path", Value: "$product"}, {Key: "preserveNullAndEmptyArrays", Value: true}}}},
		// Group by product name
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$product.name", "$company"}}}},
			{Key: "name", Value: bson.D{{Key: "$first", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$product.name", "$company"}}}}}},
			{Key: "nameurdu", Value: bson.D{{Key: "$first", Value: "$product.nameurdu"}}},
			{Key: "company", Value: bson.D{{Key: "$first", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$product.company", "$company"}}}}}},
			{Key: "category", Value: bson.D{{Key: "$first", Value: "$product.category"}}},
			{Key: "totalstock", Value: bson.D{{Key: "$sum", Value: 1}}},
			{Key: "totalvalue", Value: bson.D{{Key: "$sum", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$purchaseprice", 0}}}}}},
			{Key: "avgprice", Value: bson.D{{Key: "$avg", Value: bson.D{{Key: "$ifNull", Value: bson.A{"$sellingprice", 0}}}}}},
			{Key: "variantcount", Value: bson.D{{Key: "$sum", Value: 1}}},
		}}},
		// Filter low stock (<=5 items)
		{{Key: "$match", Value: bson.D{
			{Key: "_id", Value: bson.D{{Key: "$ne", Value: ""}}},
			{Key: "totalstock", Value: bson.D{{Key: "$lte", Value: 5}}},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "_id", Value: 1}}}},
	}

	groupCursor, groupErr := db.Collection("inventory_items").Aggregate(ctx(), groupPipe)
	var productGroups []ProductGroup
	if groupErr == nil {
		for groupCursor.Next(ctx()) {
			var pg ProductGroup
			if groupCursor.Decode(&pg) == nil {
				productGroups = append(productGroups, pg)
			}
		}
		groupCursor.Close(ctx())
	}
	if productGroups == nil {
		productGroups = []ProductGroup{}
	}

	// Calculate totals
	totalStock := 0
	totalValue := 0.0
	for _, pg := range productGroups {
		totalStock += pg.TotalStock
		totalValue += pg.TotalValue
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"productGroups": productGroups,
		"totalStock":    totalStock,
		"totalValue":    totalValue,
		"count":         len(productGroups),
	})
}

// GetAgeingStock returns products older than specified days
// GET /api/dashboard/ageing-stock?days=90
func (h *ProductGroupsHandler) GetAgeingStock(w http.ResponseWriter, r *http.Request) {
	db := getDB()
	if db == nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"error":    "Database not connected",
			"error_ur": "ڈیٹا بیس منسلک نہیں",
		})
		return
	}

	// Get days parameter, default to 90
	days := 90
	if r.URL.Query().Get("days") != "" {
		if d, err := parseInt(r.URL.Query().Get("days")); err == nil && d > 0 {
			days = d
		}
	}

	cutoffDate := time.Now().AddDate(0, 0, -days)

	// Find products created before cutoff date
	ageingPipe := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "createdat", Value: bson.D{{Key: "$lt", Value: cutoffDate}}}}}},
		{{Key: "$sort", Value: bson.D{{Key: "createdat", Value: 1}}}},
		{{Key: "$limit", Value: 200}},
	}

	ageingCursor, ageingErr := db.Collection("products").Aggregate(ctx(), ageingPipe)
	var ageingProducts []domain.Product
	if ageingErr == nil {
		for ageingCursor.Next(ctx()) {
			var prod domain.Product
			if ageingCursor.Decode(&prod) == nil {
				ageingProducts = append(ageingProducts, prod)
			}
		}
		ageingCursor.Close(ctx())
	}
	if ageingProducts == nil {
		ageingProducts = []domain.Product{}
	}

	// Format response with age in days
	type AgeingProduct struct {
		ID           string  `json:"id"`
		Name         string  `json:"name"`
		NameUrdu     string  `json:"nameUrdu"`
		SerialNumber string  `json:"serialNumber"`
		Model        string  `json:"model"`
		Company      string  `json:"company"`
		PurchaseDate string  `json:"purchaseDate"`
		CreatedAt    string  `json:"createdAt"`
		AgeDays      int     `json:"ageDays"`
		StockCount   int     `json:"stockCount"`
	}

	now := time.Now()
	ageingResults := make([]AgeingProduct, 0, len(ageingProducts))
	for _, prod := range ageingProducts {
		ageDays := int(now.Sub(prod.CreatedAt).Hours() / 24)
		ageingResults = append(ageingResults, AgeingProduct{
			ID:           prod.ID,
			Name:         prod.Name,
			NameUrdu:     prod.NameUrdu,
			SerialNumber: prod.SerialNumber,
			Model:        prod.Model,
			Company:      prod.Company,
			PurchaseDate: prod.CreatedAt.Format("2006-01-02"),
			CreatedAt:    prod.CreatedAt.Format("2006-01-02"),
			AgeDays:      ageDays,
			StockCount:   prod.StockCount,
		})
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"ageingProducts": ageingResults,
		"count":          len(ageingResults),
		"days":           days,
	})
}

// Helper function to parse integer from string
func parseInt(s string) (int, error) {
	var result int
	for _, c := range s {
		if c >= '0' && c <= '9' {
			result = result*10 + int(c-'0')
		} else {
			return 0, nil
		}
	}
	return result, nil
}