package domain

import (
	"time"
)

type Product struct {
	ID            string    `json:"id" bson:"_id"`
	Name          string    `json:"name" bson:"name"`
	NameUrdu      string    `json:"nameUrdu" bson:"nameurdu"`
	Company       string    `json:"company,omitempty" bson:"company,omitempty"`
	CompanyUrdu   string    `json:"companyUrdu,omitempty" bson:"companyurdu,omitempty"`
	Category      string    `json:"category" bson:"category"`
	Price         float64   `json:"price" bson:"price"`
	PurchasePrice float64   `json:"purchasePrice,omitempty" bson:"purchaseprice,omitempty"`
	Description   string    `json:"description,omitempty" bson:"description,omitempty"`
	InStock       bool      `json:"in_stock" bson:"in_stock"`
	StockCount    int       `json:"stockCount" bson:"stockcount"`
	SKU           string    `json:"sku,omitempty" bson:"sku,omitempty"`
	CreatedBy     string    `json:"created_by,omitempty" bson:"created_by,omitempty"`
	CreatedAt     time.Time `json:"createdAt" bson:"createdat"`
	UpdatedAt     time.Time `json:"updatedAt" bson:"updatedat"`
}
