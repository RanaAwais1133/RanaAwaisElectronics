package domain

import (
	"time"
)

type Customer struct {
	ID                 string    `json:"id" bson:"_id"`
	Name               string    `json:"name" bson:"name"`
	NameUrdu           string    `json:"nameUrdu" bson:"nameurdu"`
	FatherName         string    `json:"fatherName,omitempty" bson:"fathername,omitempty"`
	FatherNameUrdu     string    `json:"fatherNameUrdu,omitempty" bson:"fathernameurdu,omitempty"`
	Phone              string    `json:"phone" bson:"phone"`
	CNIC               string    `json:"cnic" bson:"cnic"`
	CNICImage          string    `json:"cnicImage,omitempty" bson:"cnicimage,omitempty"`
	Address            string    `json:"address" bson:"address"`
	AddressUrdu        string    `json:"addressUrdu" bson:"addressurdu"`
	Residential        string    `json:"residential,omitempty" bson:"residential,omitempty"`
	Occupant           string    `json:"occupant,omitempty" bson:"occupant,omitempty"`
	ResidentialAddress string    `json:"residentialAddress,omitempty" bson:"residentialaddress,omitempty"`
	OfficeAddress      string    `json:"officeAddress,omitempty" bson:"officeaddress,omitempty"`
	AccountNo          string    `json:"accountNo,omitempty" bson:"accountno,omitempty"`
	CostNo             string    `json:"costNo,omitempty" bson:"costno,omitempty"`
	ProcessNo          string    `json:"processNo,omitempty" bson:"processno,omitempty"`
	PrepAC             string    `json:"prepAC,omitempty" bson:"prepac,omitempty"`
	Remarks            string    `json:"remarks,omitempty" bson:"remarks,omitempty"`
	CompletedRemarks   string    `json:"completedRemarks,omitempty" bson:"completedremarks,omitempty"`
	GuarantorIDs       []string  `json:"guarantorIds" bson:"guarantorids"`
	CreatedAt          time.Time `json:"createdAt" bson:"createdat"`
	UpdatedAt          time.Time `json:"updatedAt" bson:"updatedat"`
}
