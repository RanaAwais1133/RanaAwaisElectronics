package domain

import (
	"time"
)

type InventoryItem struct {
	ID            string     `json:"id"`
	ProductID     string     `json:"productId"`
	SerialNumber  string     `json:"serialNumber"`
	Color         string     `json:"color,omitempty"`
	Model         string     `json:"model,omitempty"`
	EngineNo      string     `json:"engineNo,omitempty"`
	ChassisNo     string     `json:"chassisNo,omitempty"`
	IMEI          string     `json:"imei,omitempty"`
	Company       string     `json:"company,omitempty"`
	Status        string     `json:"status"`
	PurchaseDate  time.Time  `json:"purchaseDate"`
	PurchasePrice float64    `json:"purchasePrice,omitempty"`
	SellingPrice  float64    `json:"sellingPrice,omitempty"`
	SoldDate      *time.Time `json:"soldDate,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}
