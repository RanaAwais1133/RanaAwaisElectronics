package domain

import "time"

type Supplier struct {
	ID          string    `json:"id" bson:"_id"`
	Name        string    `json:"name" bson:"name"`
	NameUrdu    string    `json:"nameUrdu,omitempty" bson:"nameurdu,omitempty"`
	Phone       string    `json:"phone,omitempty" bson:"phone,omitempty"`
	OfficePhone string    `json:"officePhone,omitempty" bson:"officephone,omitempty"`
	CNIC        string    `json:"cnic,omitempty" bson:"cnic,omitempty"`
	Address     string    `json:"address,omitempty" bson:"address,omitempty"`
	Company     string    `json:"company,omitempty" bson:"company,omitempty"`
	Remarks     string    `json:"remarks,omitempty" bson:"remarks,omitempty"`
	CreatedAt   time.Time `json:"createdAt" bson:"createdat"`
	UpdatedAt   time.Time `json:"updatedAt" bson:"updatedat"`
}

type Purchase struct {
	ID               string          `json:"id" bson:"_id"`
	SupplierID       string          `json:"supplierId" bson:"supplierid"`
	TotalAmount      float64         `json:"totalAmount" bson:"totalamount"`
	PaidAmount       float64         `json:"paidAmount" bson:"paidamount"`
	RemainingAmount  float64         `json:"remainingAmount" bson:"remainingamount"`
	PaymentMode      string          `json:"paymentMode" bson:"paymentmode"` // cash, hybrid, credit
	DueDate          *time.Time      `json:"dueDate,omitempty" bson:"duedate,omitempty"`
	Status           string          `json:"status" bson:"status"` // completed, pending, partial
	Remarks          string          `json:"remarks,omitempty" bson:"remarks,omitempty"`
	CreatedBy        string          `json:"createdBy,omitempty" bson:"createdby,omitempty"`
	Items            []PurchaseItem  `json:"items,omitempty" bson:"items,omitempty"`
	CreatedAt        time.Time       `json:"createdAt" bson:"createdat"`
	UpdatedAt        time.Time       `json:"updatedAt" bson:"updatedat"`
}

type PurchaseItem struct {
	ID           string  `json:"id" bson:"_id"`
	PurchaseID   string  `json:"purchaseId" bson:"purchaseid"`
	ProductName  string  `json:"productName" bson:"productname"`
	SerialNumber string  `json:"serialNumber,omitempty" bson:"serialnumber,omitempty"`
	IMEI         string  `json:"imei,omitempty" bson:"imei,omitempty"`
	ChassisNo    string  `json:"chassisNo,omitempty" bson:"chassisno,omitempty"`
	EngineNo     string  `json:"engineNo,omitempty" bson:"engineno,omitempty"`
	Model        string  `json:"model,omitempty" bson:"model,omitempty"`
	Color        string  `json:"color,omitempty" bson:"color,omitempty"`
	Price        float64 `json:"price" bson:"price"`
	CreatedAt    time.Time `json:"createdAt" bson:"createdat"`
}

type SupplierPayment struct {
	ID          string    `json:"id" bson:"_id"`
	SupplierID  string    `json:"supplierId" bson:"supplierid"`
	PurchaseID  string    `json:"purchaseId,omitempty" bson:"purchaseid,omitempty"`
	Amount      float64   `json:"amount" bson:"amount"`
	Method      string    `json:"method" bson:"method"` // cash, bank
	PaymentDate time.Time `json:"paymentDate" bson:"paymentdate"`
	Remarks     string    `json:"remarks,omitempty" bson:"remarks,omitempty"`
	CreatedBy   string    `json:"createdBy,omitempty" bson:"createdby,omitempty"`
	CreatedAt   time.Time `json:"createdAt" bson:"createdat"`
}

type SupplierPromise struct {
	ID          string     `json:"id" bson:"_id"`
	SupplierID  string     `json:"supplierId" bson:"supplierid"`
	PurchaseID  string     `json:"purchaseId,omitempty" bson:"purchaseid,omitempty"`
	Amount      float64    `json:"amount" bson:"amount"`
	DueDate     time.Time  `json:"dueDate" bson:"duedate"`
	PaidAmount  float64    `json:"paidAmount" bson:"paidamount"`
	Status      string     `json:"status" bson:"status"` // pending, paid, partial
	Remarks     string     `json:"remarks,omitempty" bson:"remarks,omitempty"`
	CreatedBy   string     `json:"createdBy,omitempty" bson:"createdby,omitempty"`
	CreatedAt   time.Time  `json:"createdAt" bson:"createdat"`
	UpdatedAt   time.Time  `json:"updatedAt" bson:"updatedat"`
}