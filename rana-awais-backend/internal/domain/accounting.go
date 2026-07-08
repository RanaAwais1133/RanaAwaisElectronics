package domain

import (
	"time"
)

type AccountingEntry struct {
	ID              string    `json:"id"`
	Type            string    `json:"type"`
	Basis           string    `json:"basis"`
	Amount          float64   `json:"amount"`
	Description     string    `json:"description"`
	RelatedPlanID   string    `json:"relatedPlanId"`
	RelatedPaymentID string   `json:"relatedPaymentId"`
	FineAmount      float64   `json:"fineAmount,omitempty"`
	Date            time.Time `json:"date"`
	CreatedAt       time.Time `json:"createdAt"`
}
