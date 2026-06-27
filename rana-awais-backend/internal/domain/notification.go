package domain

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Notification struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	CustomerID        primitive.ObjectID `bson:"customer_id" json:"customerId"`
	InstallmentPlanID primitive.ObjectID `bson:"installment_plan_id,omitempty" json:"installmentPlanId"`
	Channel           string             `bson:"channel" json:"channel"` // "sms", "whatsapp", "email"
	MessageEn         string             `bson:"message_en" json:"messageEn"`
	MessageUr         string             `bson:"message_ur" json:"messageUr"`
	SentAt            time.Time          `bson:"sent_at" json:"sentAt"`
	Status            string             `bson:"status" json:"status"` // "sent", "failed", "pending"
	FineAmount        float64            `bson:"fine_amount,omitempty" json:"fineAmount,omitempty"` // ✅ NEW
	CreatedAt         time.Time          `bson:"created_at" json:"createdAt"`
}