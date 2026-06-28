package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type InventoryItem struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ProductID     primitive.ObjectID `bson:"product_id" json:"productId"`
	SerialNumber  string             `bson:"serial_number,omitempty" json:"serialNumber"`
	Status        string             `bson:"status" json:"status"`
	PurchaseDate  time.Time          `bson:"purchase_date" json:"purchaseDate"`
	PurchasePrice float64            `bson:"purchase_price,omitempty" json:"purchasePrice,omitempty"`
	SoldDate      *time.Time         `bson:"sold_date,omitempty" json:"soldDate,omitempty"`
	CreatedAt     time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt     time.Time          `bson:"updated_at" json:"updatedAt"`
}
