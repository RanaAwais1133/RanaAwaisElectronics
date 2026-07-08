package domain

import (
	"time"
)

type Payment struct {
	ID                string    `json:"id"`
	InstallmentPlanID string    `json:"installmentPlanId"`
	InstallmentNo     int       `json:"installmentNo"`
	Amount            float64   `json:"amount"`
	AmountWithoutFine float64   `json:"amountWithoutFine"`
	FinePaid          float64   `json:"finePaid"`
	Method            string    `json:"method"`
	ReceiptNumber     string    `json:"receiptNumber,omitempty"`
	TransactionDate   time.Time `json:"transactionDate"`
	PaymentDate       time.Time `json:"payment_date,omitempty"`
	CollectedBy       string    `json:"collectedBy,omitempty"`
	CollectedById     string    `json:"collectedById,omitempty"`
	RecoveryOfficer   string    `json:"recoveryOfficer,omitempty"`
	Remarks           string    `json:"remarks,omitempty"`
	IsFullPayment     bool      `json:"isFullPayment"`
	CreatedAt         time.Time `json:"createdAt"`
}
