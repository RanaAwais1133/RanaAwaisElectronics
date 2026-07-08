package domain

import (
	"time"
)

type Customer struct {
	ID                string    `json:"id" bson:"_id"`
	Name              string    `json:"name"`
	NameUrdu          string    `json:"nameUrdu"`
	FatherName        string    `json:"fatherName,omitempty"`
	FatherNameUrdu    string    `json:"fatherNameUrdu,omitempty"`
	Phone             string    `json:"phone"`
	CNIC              string    `json:"cnic"`
	CNICImage         string    `json:"cnicImage,omitempty"`
	Address           string    `json:"address"`
	AddressUrdu       string    `json:"addressUrdu"`
	Residential       string    `json:"residential,omitempty"`
	Occupant          string    `json:"occupant,omitempty"`
	ResidentialAddress string   `json:"residentialAddress,omitempty"`
	OfficeAddress     string    `json:"officeAddress,omitempty"`
	AccountNo         string    `json:"accountNo,omitempty"`
	CostNo            string    `json:"costNo,omitempty"`
	ProcessNo         string    `json:"processNo,omitempty"`
	PrepAC            string    `json:"prepAC,omitempty"`
	Remarks           string    `json:"remarks,omitempty"`
	CompletedRemarks  string    `json:"completedRemarks,omitempty"`
	GuarantorIDs      []string  `json:"guarantorIds"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}
