package domain

import "time"

// Promise represents a payment promise made by a customer
type Promise struct {
	ID              string    `json:"id" bson:"_id"`
	CustomerID      string    `json:"customer_id" bson:"customer_id"`
	PlanID          string    `json:"plan_id" bson:"plan_id"`
	InstallmentNo   int       `json:"installment_no" bson:"installment_no"`
	PromiseDate     time.Time `json:"promise_date" bson:"promise_date"`
	Amount          float64   `json:"amount" bson:"amount"`
	Status          string    `json:"status" bson:"status"`
	Remarks         string    `json:"remarks,omitempty" bson:"remarks,omitempty"`
	CreatedBy       string    `json:"created_by,omitempty" bson:"created_by,omitempty"`
	CreatedAt       time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" bson:"updated_at"`
	CustomerName    string    `json:"customer_name,omitempty" bson:"customer_name,omitempty"`
	CustomerPhone   string    `json:"customer_phone,omitempty" bson:"customer_phone,omitempty"`
	CustomerNameUr  string    `json:"customer_name_ur,omitempty" bson:"customer_name_ur,omitempty"`
	ProductName     string    `json:"product_name,omitempty" bson:"product_name,omitempty"`
	DueDate         time.Time `json:"due_date,omitempty" bson:"due_date,omitempty"`
}
