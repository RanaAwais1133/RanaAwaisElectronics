package domain

import "time"

// Promise represents a payment promise made by a customer
type Promise struct {
	ID              string    `json:"id"`
	CustomerID      string    `json:"customer_id"`
	PlanID          string    `json:"plan_id"`
	InstallmentNo   int       `json:"installment_no"`
	PromiseDate     time.Time `json:"promise_date"`
	Amount          float64   `json:"amount"`
	Status          string    `json:"status"` // "pending", "fulfilled", "broken"
	Remarks         string    `json:"remarks,omitempty"`
	CreatedBy       string    `json:"created_by,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	CustomerName    string    `json:"customer_name,omitempty"`
	CustomerPhone   string    `json:"customer_phone,omitempty"`
	CustomerNameUr  string    `json:"customer_name_ur,omitempty"`
	ProductName     string    `json:"product_name,omitempty"`
	DueDate         time.Time `json:"due_date,omitempty"`
}