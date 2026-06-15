package domain

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Payment struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	InstallmentPlanID primitive.ObjectID `bson:"installment_plan_id" json:"installmentPlanId"`
	InstallmentNo     int                `bson:"installment_no" json:"installmentNo"`
	Amount            float64            `bson:"amount" json:"amount"`
	Method            string             `bson:"method" json:"method"`
	TransactionDate   time.Time          `bson:"transaction_date" json:"transactionDate"`
	CollectedBy       string             `bson:"collected_by,omitempty" json:"collected_by,omitempty"`
	CreatedAt         time.Time          `bson:"created_at" json:"createdAt"`
}


