package domain

import (
	"time"
)

type Guarantor struct {
	ID                 string    `json:"id" bson:"_id"`
	Name               string    `json:"name" bson:"name"`
	NameUrdu           string    `json:"nameUrdu" bson:"nameurdu"`
	FatherName         string    `json:"fatherName,omitempty" bson:"fathername,omitempty"`
	FatherNameUrdu     string    `json:"fatherNameUrdu,omitempty" bson:"fathernameurdu,omitempty"`
	Phone              string    `json:"phone" bson:"phone"`
	OfficePhone        string    `json:"officePhone,omitempty" bson:"officephone,omitempty"`
	CNIC               string    `json:"cnic" bson:"cnic"`
	CNICImage          string    `json:"cnicImage" bson:"cnicimage"`
	Photo              string    `json:"photo" bson:"photo"`
	Address            string    `json:"address,omitempty" bson:"address,omitempty"`
	OfficeAddress      string    `json:"officeAddress,omitempty" bson:"officeaddress,omitempty"`
	Occupation         string    `json:"occupation,omitempty" bson:"occupation,omitempty"`
	Relation           string    `json:"relation" bson:"relation"`
	RelationToCustomer string    `json:"relationToCustomer" bson:"relationtocustomer"`
	CustomerID         string    `json:"customerId" bson:"customerid"`
	VerificationStatus string    `json:"verificationStatus" bson:"verificationstatus"`
	CreatedAt          time.Time `json:"createdAt" bson:"createdat"`
	UpdatedAt          time.Time `json:"updatedAt" bson:"updatedat"`
}
