package domain

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Customer struct {
	ID           primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	Name         string               `bson:"name" json:"name"`
	NameUrdu     string               `bson:"name_urdu" json:"nameUrdu"`
	FatherName   string               `bson:"father_name,omitempty" json:"fatherName,omitempty"`
	FatherNameUrdu string             `bson:"father_name_urdu,omitempty" json:"fatherNameUrdu,omitempty"`
	Phone        string               `bson:"phone" json:"phone"`
	CNIC         string               `bson:"cnic" json:"cnic"`
	CNICImage    string               `bson:"cnic_image,omitempty" json:"cnicImage,omitempty"`
	Address      string               `bson:"address" json:"address"`
	AddressUrdu  string               `bson:"address_urdu" json:"addressUrdu"`
	
	// ✅ NEW: Fields for receipt matching image
	Residential     string `bson:"residential,omitempty" json:"residential,omitempty"`         // "Personal"
	Occupant        string `bson:"occupant,omitempty" json:"occupant,omitempty"`               // "Own"
	ResidentialAddress string `bson:"residential_address,omitempty" json:"residentialAddress,omitempty"`
	OfficeAddress   string `bson:"office_address,omitempty" json:"officeAddress,omitempty"`
	AccountNo       string `bson:"account_no,omitempty" json:"accountNo,omitempty"`
	CostNo          string `bson:"cost_no,omitempty" json:"costNo,omitempty"`
	ProcessNo       string `bson:"process_no,omitempty" json:"processNo,omitempty"`
	ReprAsCost      string `bson:"repr_as_cost,omitempty" json:"reprAsCost,omitempty"`
	ReprAsGar       string `bson:"repr_as_gar,omitempty" json:"reprAsGar,omitempty"`
	PrepAC          string `bson:"prep_ac,omitempty" json:"prepAC,omitempty"`
	
	GuarantorIDs []primitive.ObjectID `bson:"guarantor_ids,omitempty" json:"guarantorIds"`
	CreatedAt    time.Time            `bson:"created_at" json:"createdAt"`
	UpdatedAt    time.Time            `bson:"updated_at" json:"updatedAt"`
}