package domain

import (
	"time"
)

type Product struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	NameUrdu      string    `json:"nameUrdu"`
	Company       string    `json:"company,omitempty"`
	CompanyUrdu   string    `json:"companyUrdu,omitempty"`
	Category      string    `json:"category"`
	Price         float64   `json:"price"`
	PurchasePrice float64   `json:"purchasePrice,omitempty"`
	Description   string    `json:"description,omitempty"`
	InStock       bool      `json:"in_stock"`
	StockCount    int       `json:"stockCount"`
	SKU           string    `json:"sku,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}
