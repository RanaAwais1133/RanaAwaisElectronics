package domain

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type InventoryItem struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ProductID     primitive.ObjectID `bson:"product_id" json:"productId"`
	SerialNumber  string             `bson:"serial_number,omitempty" json:"serialNumber"`
	Color         string             `bson:"color,omitempty" json:"color,omitempty"`               // vehicle / item color
	Model         string             `bson:"model,omitempty" json:"model,omitempty"`               // model name/number
	EngineNo      string             `bson:"engine_no,omitempty" json:"engineNo,omitempty"`         // vehicle engine number
	ChassisNo     string             `bson:"chassis_no,omitempty" json:"chassisNo,omitempty"`       // vehicle chassis number
	IMEI          string             `bson:"imei,omitempty" json:"imei,omitempty"`                 // mobile phone IMEI
	Company       string             `bson:"company,omitempty" json:"company,omitempty"`            // manufacturer / brand
	Status        string             `bson:"status" json:"status"` // "in_stock", "sold", "returned"
	PurchaseDate  time.Time          `bson:"purchase_date" json:"purchaseDate"`
	PurchasePrice float64            `bson:"purchase_price,omitempty" json:"purchasePrice,omitempty"`
	SoldDate      *time.Time         `bson:"sold_date,omitempty" json:"soldDate,omitempty"`
	CreatedAt     time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt     time.Time          `bson:"updated_at" json:"updatedAt"`
}