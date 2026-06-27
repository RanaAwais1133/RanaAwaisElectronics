package domain

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Payment struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	InstallmentPlanID primitive.ObjectID `bson:"installment_plan_id" json:"installmentPlanId"`
	InstallmentNo     int                `bson:"installment_no" json:"installmentNo"`
	Amount            float64            `bson:"amount" json:"amount"`                     // Total paid (including fine)
	AmountWithoutFine float64            `bson:"amount_without_fine,omitempty" json:"amountWithoutFine"` // ✅ NEW: Original amount without fine
	FinePaid          float64            `bson:"fine_paid,omitempty" json:"finePaid"`      // ✅ NEW: Fine amount paid
	Method            string             `bson:"method" json:"method"`                     // "cash", "bank", "easypaisa", "jazzcash"
	ReceiptNumber     string             `bson:"receipt_number,omitempty" json:"receiptNumber"` // ✅ NEW: Rev.#
	TransactionDate   time.Time          `bson:"transaction_date" json:"transactionDate"`
	PaymentDate       time.Time          `bson:"payment_date,omitempty" json:"payment_date,omitempty"`
	CollectedBy       string             `bson:"collected_by,omitempty" json:"collectedBy,omitempty"`
	CollectedById     string             `bson:"collected_by_id,omitempty" json:"collectedById,omitempty"` // ✅ NEW
	RecoveryOfficer   string             `bson:"recovery_officer,omitempty" json:"recoveryOfficer,omitempty"` // ✅ NEW
	Remarks           string             `bson:"remarks,omitempty" json:"remarks,omitempty"`               // ✅ NEW
	IsFullPayment     bool               `bson:"is_full_payment,omitempty" json:"isFullPayment"`           // ✅ NEW: Full or partial
	CreatedAt         time.Time          `bson:"created_at" json:"createdAt"`
}