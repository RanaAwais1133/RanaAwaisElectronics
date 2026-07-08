package domain

import (
	"time"
)

type Receipt struct {
	ID            string    `json:"id" bson:"_id"`
	PaymentID     string    `json:"paymentId" bson:"paymentid"`
	PlanID        string    `json:"planId,omitempty" bson:"planid,omitempty"`
	ReceiptNumber string    `json:"receiptNumber" bson:"receiptnumber"`
	HeaderEn      string    `json:"headerEn" bson:"headeren"`
	HeaderUr      string    `json:"headerUr" bson:"headerur"`
	BodyEn        string    `json:"bodyEn" bson:"bodyen"`
	BodyUr        string    `json:"bodyUr" bson:"bodyur"`
	TotalAmount   float64   `json:"totalAmount" bson:"totalamount"`
	FineAmount    float64   `json:"fineAmount" bson:"fineamount"`
	PrintedAt     time.Time `json:"printedAt" bson:"printedat"`
	CreatedAt     time.Time `json:"createdAt" bson:"createdat"`
}
