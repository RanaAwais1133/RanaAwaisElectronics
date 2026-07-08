package domain

import (
	"time"
)

type Guarantor struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	NameUrdu           string    `json:"nameUrdu"`
	FatherName         string    `json:"fatherName,omitempty"`
	FatherNameUrdu     string    `json:"fatherNameUrdu,omitempty"`
	Phone              string    `json:"phone"`
	OfficePhone        string    `json:"officePhone,omitempty"`
	CNIC               string    `json:"cnic"`
	CNICImage          string    `json:"cnicImage"`
	Photo              string    `json:"photo"`
	Address            string    `json:"address,omitempty"`
	OfficeAddress      string    `json:"officeAddress,omitempty"`
	Occupation         string    `json:"occupation,omitempty"`
	Relation           string    `json:"relation"`
	RelationToCustomer string    `json:"relationToCustomer"`
	CustomerID         string    `json:"customerId"`
	VerificationStatus string    `json:"verificationStatus"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}
