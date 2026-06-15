package domain

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Receipt struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PaymentID primitive.ObjectID `bson:"payment_id" json:"paymentId"`
	HeaderEn  string             `bson:"header_en" json:"headerEn"`
	HeaderUr  string             `bson:"header_ur" json:"headerUr"`
	BodyEn    string             `bson:"body_en" json:"bodyEn"`
	BodyUr    string             `bson:"body_ur" json:"bodyUr"`
	PrintedAt time.Time          `bson:"printed_at" json:"printedAt"`
	CreatedAt time.Time          `bson:"created_at" json:"createdAt"`
}