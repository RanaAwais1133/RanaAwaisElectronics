package domain

import (
	"time"
)

type Notification struct {
	ID                string    `json:"id" bson:"_id"`
	CustomerID        string    `json:"customerId" bson:"customerid"`
	InstallmentPlanID string    `json:"installmentPlanId" bson:"installmentplanid"`
	Channel           string    `json:"channel" bson:"channel"`
	MessageEn         string    `json:"messageEn" bson:"messageen"`
	MessageUr         string    `json:"messageUr" bson:"messageur"`
	SentAt            time.Time `json:"sentAt" bson:"sentat"`
	Status            string    `json:"status" bson:"status"`
	FineAmount        float64   `json:"fineAmount,omitempty" bson:"fineamount,omitempty"`
	CreatedAt         time.Time `json:"createdAt" bson:"createdat"`
}
