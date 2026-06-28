package domain

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type InventoryItem struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ProductID     primitive.ObjectID `bson:"product_id" json:"productId"`
	SerialNumber  string             `bson:"serial_number,omitempty" json:"serialNumber"`
	Color         string             `bson:"color,omitempty" json:"color,omitempty"`
	Model         string             `bson:"model,omitempty" json:"model,omitempty"`
	EngineNo      string             `bson:"engine_no,omitempty" json:"engineNo,omitempty"`
	ChassisNo     string             `bson:"chassis_no,omitempty" json:"chassisNo,omitempty"`
	IMEI          string             `bson:"imei,omitempty" json:"imei,omitempty"`
	Company       string             `bson:"company,omitempty" json:"company,omitempty"`
	Status        string             `bson:"status" json:"status"` // "in_stock", "sold", "returned"
	PurchaseDate  time.Time          `bson:"purchase_date" json:"purchaseDate"`
	PurchasePrice float64            `bson:"purchase_price,omitempty" json:"purchasePrice,omitempty"`
	SellingPrice  float64            `bson:"selling_price,omitempty" json:"sellingPrice,omitempty"` // ✅ NEW
	SoldDate      *time.Time         `bson:"sold_date,omitempty" json:"soldDate,omitempty"`
	CreatedAt     time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt     time.Time          `bson:"updated_at" json:"updatedAt"`
}
