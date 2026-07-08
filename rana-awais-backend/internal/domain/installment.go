package domain

import (
	"time"
)

type InstallmentPlan struct {
	ID                   string              `json:"id"`
	CustomerID           string              `json:"customerId"`
	ProductID            string              `json:"productId"`
	InventoryItemID      string              `json:"inventoryItemId,omitempty"`
	GuarantorIDs         []string            `json:"guarantorIds,omitempty"`
	TotalAmount          float64             `json:"totalAmount"`
	DownPayment          float64             `json:"downPayment"`
	RemainingAmount      float64             `json:"remainingAmount"`
	NumberOfInstallments int                 `json:"numInstallments"`
	InstallmentAmount    float64             `json:"installmentAmount"`
	StartDate            time.Time           `json:"startDate"`
	EndDate              time.Time           `json:"endDate"`
	GracePeriodDays      int                 `json:"gracePeriodDays"`
	FinePerDay           float64             `json:"finePerDay"`
	FineType             string              `json:"fineType"`
	FixedFineAmount      float64             `json:"fixedFineAmount"`
	Status               string              `json:"status"`
	Installments         []InstallmentDetail `json:"installments"`
	InstallmentDate      int                 `json:"installmentDate,omitempty"`
	PaymentType          string              `json:"paymentType,omitempty"`
	SerialNumber         string              `json:"serialNumber,omitempty"`
	IMEI                 string              `json:"imei,omitempty"`
	EngineNo             string              `json:"engineNo,omitempty"`
	ChassisNo            string              `json:"chassisNo,omitempty"`
	Model                string              `json:"model,omitempty"`
	Color                string              `json:"color,omitempty"`
	Company              string              `json:"company,omitempty"`
	ProcessFee           float64             `json:"processFee,omitempty"`
	Discount             float64             `json:"discount,omitempty"`
	SalaryIncome         float64             `json:"salaryIncome,omitempty"`
	Defaulter            string              `json:"defaulter,omitempty"`
	PTO                  string              `json:"pto,omitempty"`
	VPNStatus            string              `json:"vpnStatus,omitempty"`
	EmployeeStatus       string              `json:"employeeStatus,omitempty"`
	DBMRemarks           string              `json:"dbmRemarks,omitempty"`
	CRCRemarks           string              `json:"crcRemarks,omitempty"`
	ProcessAt            string              `json:"processAt,omitempty"`
	DOOfficer            string              `json:"doOfficer,omitempty"`
	MarkOff              string              `json:"markOff,omitempty"`
	DebtMng              string              `json:"debtMng,omitempty"`
	SecondMng            string              `json:"secondMng,omitempty"`
	InspOff              string              `json:"inspOff,omitempty"`
	SRM                  string              `json:"srm,omitempty"`
	MobilePhone          string              `json:"mobilePhone,omitempty"`
	CRC                  string              `json:"crc,omitempty"`
	CreatedBy            string              `json:"createdBy,omitempty"`
	CreatedAt            time.Time           `json:"createdAt"`
	UpdatedAt            time.Time           `json:"updatedAt"`
	Remarks              string              `json:"remarks,omitempty"`
	CompletedDate        *time.Time          `json:"completedDate,omitempty"`
	CompletedBy          string              `json:"completedBy,omitempty"`
}

type InstallmentDetail struct {
	InstallmentNo int        `json:"installmentNo"`
	DueDate       time.Time  `json:"dueDate"`
	Amount        float64    `json:"amount"`
	Paid          bool       `json:"paid"`
	PaidDate      *time.Time `json:"paidDate,omitempty"`
	Fine          float64    `json:"fine"`
	FinePerDay    float64    `json:"finePerDay"`
	DaysLate      int        `json:"daysLate"`
	FineApplied   float64    `json:"fineApplied"`
	TotalPayable  float64    `json:"totalPayable"`
	PartialPaid   float64    `json:"partialPaid"`
	Remaining     float64    `json:"remaining"`
	CollectedBy   string     `json:"collectedBy,omitempty"`
	CollectedById string     `json:"collectedById,omitempty"`
	Remarks       string     `json:"remarks,omitempty"`
}
