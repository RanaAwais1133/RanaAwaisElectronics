package domain

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AccountingEntry struct {
	ID            primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Type          string              `bson:"type" json:"type"`
	Basis         string              `bson:"basis" json:"basis"`
	Amount        float64             `bson:"amount" json:"amount"`
	Description   string              `bson:"description" json:"description"`
	RelatedPlanID *primitive.ObjectID `bson:"related_plan_id,omitempty" json:"relatedPlanId"`
	Date          time.Time           `bson:"date" json:"date"`
	CreatedAt     time.Time           `bson:"created_at" json:"createdAt"`
}