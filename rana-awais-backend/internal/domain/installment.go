package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type InstallmentPlan struct {
	ID                   primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	CustomerID           primitive.ObjectID   `bson:"customer_id" json:"customerId"`
	ProductID            primitive.ObjectID   `bson:"product_id" json:"productId"`
	InventoryItemID      primitive.ObjectID   `bson:"inventory_item_id,omitempty" json:"inventoryItemId,omitempty"`
	GuarantorIDs         []primitive.ObjectID `bson:"guarantor_ids,omitempty" json:"guarantorIds,omitempty"`
	TotalAmount          float64              `bson:"total_amount" json:"totalAmount"`
	DownPayment          float64              `bson:"down_payment" json:"downPayment"`
	RemainingAmount      float64              `bson:"remaining_amount" json:"remainingAmount"`
	NumberOfInstallments int                  `bson:"num_installments" json:"numInstallments"`
	InstallmentAmount    float64              `bson:"installment_amount" json:"installmentAmount"`
	StartDate            time.Time            `bson:"start_date" json:"startDate"`
	EndDate              time.Time            `bson:"end_date" json:"endDate"`
	GracePeriodDays      int                  `bson:"grace_period_days" json:"gracePeriodDays"`
	FinePerDay           float64              `bson:"fine_per_day" json:"finePerDay"`
	Status               string               `bson:"status" json:"status"`
	Installments         []InstallmentDetail  `bson:"installments" json:"installments"`

	// ✅ NEW: Product detail fields (optional)
	SerialNumber string `bson:"serial_number,omitempty" json:"serialNumber,omitempty"`
	IMEI         string `bson:"imei,omitempty" json:"imei,omitempty"`
	EngineNo     string `bson:"engine_no,omitempty" json:"engineNo,omitempty"`
	ChassisNo    string `bson:"chassis_no,omitempty" json:"chassisNo,omitempty"`
	Model        string `bson:"model,omitempty" json:"model,omitempty"`
	Color        string `bson:"color,omitempty" json:"color,omitempty"`
	Company      string `bson:"company,omitempty" json:"company,omitempty"`

	// ✅ NEW: Who created this plan (e.g. Huzaifa, Ali)
	CreatedBy string `bson:"created_by,omitempty" json:"createdBy,omitempty"`

	CreatedAt time.Time `bson:"created_at" json:"createdAt"`
	UpdatedAt time.Time `bson:"updated_at" json:"updatedAt"`
}

type InstallmentDetail struct {
	InstallmentNo int        `bson:"installment_no" json:"installmentNo"`
	DueDate       time.Time  `bson:"due_date" json:"dueDate"`
	Amount        float64    `bson:"amount" json:"amount"`
	Paid          bool       `bson:"paid" json:"paid"`
	PaidDate      *time.Time `bson:"paid_date,omitempty" json:"paidDate,omitempty"`
	Fine          float64    `bson:"fine" json:"fine"`
	PartialPaid   float64    `bson:"partial_paid" json:"partialPaid"`
	Remaining     float64    `bson:"remaining" json:"remaining"`
	// ✅ NEW: Who collected this payment (e.g. Huzaifa, Ali)
	CollectedBy string `bson:"collected_by,omitempty" json:"collectedBy,omitempty"`
}
