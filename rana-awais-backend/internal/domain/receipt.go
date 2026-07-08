package domain

import (
	"time"
)

type Receipt struct {
	ID            string    `json:"id"`
	PaymentID     string    `json:"paymentId"`
	PlanID        string    `json:"planId,omitempty"`
	ReceiptNumber string    `json:"receiptNumber"`
	HeaderEn      string    `json:"headerEn"`
	HeaderUr      string    `json:"headerUr"`
	BodyEn        string    `json:"bodyEn"`
	BodyUr        string    `json:"bodyUr"`
	TotalAmount   float64   `json:"totalAmount"`
	FineAmount    float64   `json:"fineAmount"`
	PrintedAt     time.Time `json:"printedAt"`
	CreatedAt     time.Time `json:"createdAt"`
}
