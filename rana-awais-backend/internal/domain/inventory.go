package domain

import (
	"time"
)

type InventoryItem struct {
	ID            string     `json:"id" bson:"_id"`
	ProductID     string     `json:"productId" bson:"productid"`
	SerialNumber  string     `json:"serialNumber" bson:"serialnumber"`
	Color         string     `json:"color,omitempty" bson:"color,omitempty"`
	Model         string     `json:"model,omitempty" bson:"model,omitempty"`
	EngineNo      string     `json:"engineNo,omitempty" bson:"engineno,omitempty"`
	ChassisNo     string     `json:"chassisNo,omitempty" bson:"chassisno,omitempty"`
	IMEI          string     `json:"imei,omitempty" bson:"imei,omitempty"`
	Company       string     `json:"company,omitempty" bson:"company,omitempty"`
	Status        string     `json:"status" bson:"status"`
	PurchaseDate  time.Time  `json:"purchaseDate" bson:"purchasedate"`
	PurchasePrice float64    `json:"purchasePrice,omitempty" bson:"purchaseprice,omitempty"`
	SellingPrice  float64    `json:"sellingPrice,omitempty" bson:"sellingprice,omitempty"`
	SoldDate      *time.Time `json:"soldDate,omitempty" bson:"solddate,omitempty"`
	CreatedAt     time.Time  `json:"createdAt" bson:"createdat"`
	UpdatedAt     time.Time  `json:"updatedAt" bson:"updatedat"`
}
