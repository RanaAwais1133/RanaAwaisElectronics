package domain

import (
	"time"
)

type Notification struct {
	ID                string    `json:"id"`
	CustomerID        string    `json:"customerId"`
	InstallmentPlanID string    `json:"installmentPlanId"`
	Channel           string    `json:"channel"`
	MessageEn         string    `json:"messageEn"`
	MessageUr         string    `json:"messageUr"`
	SentAt            time.Time `json:"sentAt"`
	Status            string    `json:"status"`
	FineAmount        float64   `json:"fineAmount,omitempty"`
	CreatedAt         time.Time `json:"createdAt"`
}
