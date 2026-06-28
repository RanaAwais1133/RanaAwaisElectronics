package domain

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Product struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name          string             `bson:"name" json:"name"`
	NameUrdu      string             `bson:"name_urdu" json:"nameUrdu"`
	Company       string             `bson:"company,omitempty" json:"company,omitempty"`
	CompanyUrdu   string             `bson:"company_urdu,omitempty" json:"companyUrdu,omitempty"`
	Category      string             `bson:"category" json:"category"`
	Price         float64            `bson:"price" json:"price"`                     // selling price
	PurchasePrice float64            `bson:"purchase_price,omitempty" json:"purchasePrice,omitempty"`
	Description   string             `bson:"description,omitempty" json:"description,omitempty"`
	InStock       bool               `bson:"in_stock" json:"in_stock"`
	StockCount    int                `bson:"stock_count" json:"stockCount"`
	SKU           string             `bson:"sku,omitempty" json:"sku,omitempty"`     // ✅ NEW
	CreatedAt     time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt     time.Time          `bson:"updated_at" json:"updatedAt"`
}
