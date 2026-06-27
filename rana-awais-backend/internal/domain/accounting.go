package domain

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AccountingEntry struct {
	ID            primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Type          string              `bson:"type" json:"type"`           // "revenue", "expense", "profit", "fine"
	Basis         string              `bson:"basis" json:"basis"`         // "sale", "payment", "fine", "expense"
	Amount        float64             `bson:"amount" json:"amount"`
	Description   string              `bson:"description" json:"description"`
	RelatedPlanID *primitive.ObjectID `bson:"related_plan_id,omitempty" json:"relatedPlanId"`
	RelatedPaymentID *primitive.ObjectID `bson:"related_payment_id,omitempty" json:"relatedPaymentId"`
	FineAmount    float64             `bson:"fine_amount,omitempty" json:"fineAmount,omitempty"` // ✅ NEW: Fine included
	Date          time.Time           `bson:"date" json:"date"`
	CreatedAt     time.Time           `bson:"created_at" json:"createdAt"`
}