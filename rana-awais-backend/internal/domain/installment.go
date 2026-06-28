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
	Status               string               `bson:"status" json:"status"` // "Open", "Completed", "Defaulted"
	Installments         []InstallmentDetail  `bson:"installments" json:"installments"`

	// Product detail fields
	SerialNumber string `bson:"serial_number,omitempty" json:"serialNumber,omitempty"`
	IMEI         string `bson:"imei,omitempty" json:"imei,omitempty"`
	EngineNo     string `bson:"engine_no,omitempty" json:"engineNo,omitempty"`
	ChassisNo    string `bson:"chassis_no,omitempty" json:"chassisNo,omitempty"`
	Model        string `bson:"model,omitempty" json:"model,omitempty"`
	Color        string `bson:"color,omitempty" json:"color,omitempty"`
	Company      string `bson:"company,omitempty" json:"company,omitempty"`

	// ✅ NEW: Additional fields from image
	AdvanceAmount   float64 `bson:"advance_amount,omitempty" json:"advanceAmount,omitempty"`
	AdvanceReceived int     `bson:"advance_received,omitempty" json:"advanceReceived,omitempty"`
	ProcessFee      float64 `bson:"process_fee,omitempty" json:"processFee,omitempty"`
	Discount        float64 `bson:"discount,omitempty" json:"discount,omitempty"`
	SalaryIncome    float64 `bson:"salary_income,omitempty" json:"salaryIncome,omitempty"`
	Defaulter       string  `bson:"defaulter,omitempty" json:"defaulter,omitempty"`
	PTO             string  `bson:"pto,omitempty" json:"pto,omitempty"`
	VPNStatus       string  `bson:"vpn_status,omitempty" json:"vpnStatus,omitempty"`
	EmployeeStatus  string  `bson:"employee_status,omitempty" json:"employeeStatus,omitempty"`
	DBMRemarks      string  `bson:"dbm_remarks,omitempty" json:"dbmRemarks,omitempty"`
	CRCRemarks      string  `bson:"crc_remarks,omitempty" json:"crcRemarks,omitempty"`
	ProcessAt       string  `bson:"process_at,omitempty" json:"processAt,omitempty"`
	DOOfficer       string  `bson:"do_officer,omitempty" json:"doOfficer,omitempty"`
	MarkOff         string  `bson:"mark_off,omitempty" json:"markOff,omitempty"`
	DebtMng         string  `bson:"debt_mng,omitempty" json:"debtMng,omitempty"`
	SecondMng       string  `bson:"second_mng,omitempty" json:"secondMng,omitempty"`
	InspOff         string  `bson:"insp_off,omitempty" json:"inspOff,omitempty"`
	SRM             string  `bson:"srm,omitempty" json:"srm,omitempty"`
	MobilePhone     string  `bson:"mobile_phone,omitempty" json:"mobilePhone,omitempty"`
	CRC             string  `bson:"crc,omitempty" json:"crc,omitempty"`

	CreatedBy string    `bson:"created_by,omitempty" json:"createdBy,omitempty"`
	CreatedAt time.Time `bson:"created_at" json:"createdAt"`
	UpdatedAt time.Time `bson:"updated_at" json:"updatedAt"`
}

type InstallmentDetail struct {
	InstallmentNo int        `bson:"installment_no" json:"installmentNo"`
	DueDate       time.Time  `bson:"due_date" json:"dueDate"`
	Amount        float64    `bson:"amount" json:"amount"`
	Paid          bool       `bson:"paid" json:"paid"`
	PaidDate      *time.Time `bson:"paid_date,omitempty" json:"paidDate,omitempty"`
	
	// ✅ NEW: Fine system
	Fine           float64 `bson:"fine" json:"fine"`                     // Total fine applied
	FinePerDay     float64 `bson:"fine_per_day" json:"finePerDay"`       // Fine rate per day
	DaysLate       int     `bson:"days_late" json:"daysLate"`            // Number of days overdue
	FineApplied    float64 `bson:"fine_applied" json:"fineApplied"`      // Applied fine amount
	TotalPayable   float64 `bson:"total_payable" json:"totalPayable"`    // Amount + Fine
	PartialPaid    float64 `bson:"partial_paid" json:"partialPaid"`      // Partial payment amount
	Remaining      float64 `bson:"remaining" json:"remaining"`           // TotalPayable - PartialPaid
	
	// Payment tracking
	CollectedBy   string `bson:"collected_by,omitempty" json:"collectedBy,omitempty"`
	CollectedById string `bson:"collected_by_id,omitempty" json:"collectedById,omitempty"`
	Remarks       string `bson:"remarks,omitempty" json:"remarks,omitempty"`
}
