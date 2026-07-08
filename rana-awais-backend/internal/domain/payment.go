package domain

import (
	"time"
)

type Payment struct {
	ID                string    `json:"id" bson:"_id"`
	InstallmentPlanID string    `json:"installmentPlanId" bson:"installmentplanid"`
	InstallmentNo     int       `json:"installmentNo" bson:"installmentno"`
	Amount            float64   `json:"amount" bson:"amount"`
	AmountWithoutFine float64   `json:"amountWithoutFine" bson:"amountwithoutfine"`
	FinePaid          float64   `json:"finePaid" bson:"finepaid"`
	Method            string    `json:"method" bson:"method"`
	ReceiptNumber     string    `json:"receiptNumber,omitempty" bson:"receiptnumber,omitempty"`
	TransactionDate   time.Time `json:"transactionDate" bson:"transactiondate"`
	PaymentDate       time.Time `json:"payment_date,omitempty" bson:"paymentdate,omitempty"`
	CollectedBy       string    `json:"collectedBy,omitempty" bson:"collectedby,omitempty"`
	CollectedById     string    `json:"collectedById,omitempty" bson:"collectedbyid,omitempty"`
	RecoveryOfficer   string    `json:"recoveryOfficer,omitempty" bson:"recoveryofficer,omitempty"`
	Remarks           string    `json:"remarks,omitempty" bson:"remarks,omitempty"`
	IsFullPayment     bool      `json:"isFullPayment" bson:"isfullpayment"`
	CreatedAt         time.Time `json:"createdAt" bson:"createdat"`
}
