package domain

import (
	"time"
)

type AccountingEntry struct {
	ID              string    `json:"id" bson:"_id"`
	Type            string    `json:"type" bson:"type"`
	Basis           string    `json:"basis" bson:"basis"`
	Amount          float64   `json:"amount" bson:"amount"`
	Description     string    `json:"description" bson:"description"`
	RelatedPlanID   string    `json:"relatedPlanId" bson:"relatedplanid"`
	RelatedPaymentID string   `json:"relatedPaymentId" bson:"relatedpaymentid"`
	FineAmount      float64   `json:"fineAmount,omitempty" bson:"fineamount,omitempty"`
	Date            time.Time `json:"date" bson:"date"`
	CreatedAt       time.Time `json:"createdAt" bson:"createdat"`
}
