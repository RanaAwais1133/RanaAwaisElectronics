package domain

import (
	"time"
)

type InstallmentPlan struct {
	ID                   string              `json:"id" bson:"_id"`
	CustomerID           string              `json:"customerId" bson:"customerid"`
	ProductID            string              `json:"productId" bson:"productid"`
	InventoryItemID      string              `json:"inventoryItemId,omitempty" bson:"inventoryitemid,omitempty"`
	GuarantorIDs         []string            `json:"guarantorIds,omitempty" bson:"guarantorids,omitempty"`
	TotalAmount          float64             `json:"totalAmount" bson:"totalamount"`
	DownPayment          float64             `json:"downPayment" bson:"downpayment"`
	RemainingAmount      float64             `json:"remainingAmount" bson:"remainingamount"`
	NumberOfInstallments int                 `json:"numInstallments" bson:"numberofinstallments"`
	InstallmentAmount    float64             `json:"installmentAmount" bson:"installmentamount"`
	StartDate            time.Time           `json:"startDate" bson:"startdate"`
	EndDate              time.Time           `json:"endDate" bson:"enddate"`
	GracePeriodDays      int                 `json:"gracePeriodDays" bson:"graceperioddays"`
	FinePerDay           float64             `json:"finePerDay" bson:"fineperday"`
	FineType             string              `json:"fineType" bson:"finetype"`
	FixedFineAmount      float64             `json:"fixedFineAmount" bson:"fixedfineamount"`
	Status               string              `json:"status" bson:"status"`
	Installments         []InstallmentDetail `json:"installments" bson:"-"`
	InstallmentDate      int                 `json:"installmentDate,omitempty" bson:"installmentdate,omitempty"`
	PaymentType          string              `json:"paymentType,omitempty" bson:"paymenttype,omitempty"`
	SerialNumber         string              `json:"serialNumber,omitempty" bson:"serialnumber,omitempty"`
	IMEI                 string              `json:"imei,omitempty" bson:"imei,omitempty"`
	EngineNo             string              `json:"engineNo,omitempty" bson:"engineno,omitempty"`
	ChassisNo            string              `json:"chassisNo,omitempty" bson:"chassisno,omitempty"`
	Model                string              `json:"model,omitempty" bson:"model,omitempty"`
	Color                string              `json:"color,omitempty" bson:"color,omitempty"`
	Company              string              `json:"company,omitempty" bson:"company,omitempty"`
	ProcessFee           float64             `json:"processFee,omitempty" bson:"processfee,omitempty"`
	Discount             float64             `json:"discount,omitempty" bson:"discount,omitempty"`
	SalaryIncome         float64             `json:"salaryIncome,omitempty" bson:"salaryincome,omitempty"`
	Defaulter            string              `json:"defaulter,omitempty" bson:"defaulter,omitempty"`
	PTO                  string              `json:"pto,omitempty" bson:"pto,omitempty"`
	VPNStatus            string              `json:"vpnStatus,omitempty" bson:"vpnstatus,omitempty"`
	EmployeeStatus       string              `json:"employeeStatus,omitempty" bson:"employeestatus,omitempty"`
	DBMRemarks           string              `json:"dbmRemarks,omitempty" bson:"dbmremarks,omitempty"`
	CRCRemarks           string              `json:"crcRemarks,omitempty" bson:"crcremarks,omitempty"`
	ProcessAt            string              `json:"processAt,omitempty" bson:"processat,omitempty"`
	DOOfficer            string              `json:"doOfficer,omitempty" bson:"doofficer,omitempty"`
	MarkOff              string              `json:"markOff,omitempty" bson:"markoff,omitempty"`
	DebtMng              string              `json:"debtMng,omitempty" bson:"debtmng,omitempty"`
	SecondMng            string              `json:"secondMng,omitempty" bson:"secondmng,omitempty"`
	InspOff              string              `json:"inspOff,omitempty" bson:"inspectionofficial,omitempty"`
	SRM                  string              `json:"srm,omitempty" bson:"srm,omitempty"`
	MobilePhone          string              `json:"mobilePhone,omitempty" bson:"mobilephone,omitempty"`
	CRC                  string              `json:"crc,omitempty" bson:"crc,omitempty"`
	CreatedBy            string              `json:"createdBy,omitempty" bson:"createdby,omitempty"`
	CreatedAt            time.Time           `json:"createdAt" bson:"createdat"`
	UpdatedAt            time.Time           `json:"updatedAt" bson:"updatedat"`
	Remarks              string              `json:"remarks,omitempty" bson:"remarks,omitempty"`
	CompletedDate        *time.Time          `json:"completedDate,omitempty" bson:"completeddate,omitempty"`
	CompletedBy          string              `json:"completedBy,omitempty" bson:"completedby,omitempty"`
}

type InstallmentDetail struct {
	InstallmentNo int        `json:"installmentNo" bson:"installment_no"`
	DueDate       time.Time  `json:"dueDate" bson:"due_date"`
	Amount        float64    `json:"amount" bson:"amount"`
	Paid          bool       `json:"paid" bson:"paid"`
	PaidDate      *time.Time `json:"paidDate,omitempty" bson:"paid_date,omitempty"`
	Fine          float64    `json:"fine" bson:"fine"`
	FinePerDay    float64    `json:"finePerDay" bson:"fine_per_day"`
	DaysLate      int        `json:"daysLate" bson:"days_late"`
	FineApplied   float64    `json:"fineApplied" bson:"fine_applied"`
	TotalPayable  float64    `json:"totalPayable" bson:"total_payable"`
	PartialPaid   float64    `json:"partialPaid" bson:"partial_paid"`
	Remaining     float64    `json:"remaining" bson:"remaining"`
	CollectedBy   string     `json:"collectedBy,omitempty" bson:"collected_by,omitempty"`
	CollectedById string     `json:"collectedById,omitempty" bson:"collected_by_id,omitempty"`
	Remarks       string     `json:"remarks,omitempty" bson:"remarks,omitempty"`
}
