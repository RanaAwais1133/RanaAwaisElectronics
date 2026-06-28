package domain

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Guarantor struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name               string             `bson:"name" json:"name"`
	NameUrdu           string             `bson:"name_urdu" json:"nameUrdu"`
	FatherName         string             `bson:"father_name,omitempty" json:"fatherName,omitempty"`
	FatherNameUrdu     string             `bson:"father_name_urdu,omitempty" json:"fatherNameUrdu,omitempty"`
	Phone              string             `bson:"phone" json:"phone"`
	OfficePhone        string             `bson:"office_phone,omitempty" json:"officePhone,omitempty"` // ✅ NEW
	CNIC               string             `bson:"cnic" json:"cnic"`
	CNICImage          string             `bson:"cnic_image,omitempty" json:"cnicImage"`
	Photo              string             `bson:"photo,omitempty" json:"photo"`
	Address            string             `bson:"address,omitempty" json:"address"`                   // ✅ NEW
	OfficeAddress      string             `bson:"office_address,omitempty" json:"officeAddress"`     // ✅ NEW
	Occupation         string             `bson:"occupation,omitempty" json:"occupation"`             // ✅ NEW
	Relation           string             `bson:"relation" json:"relation"`                           // "Sister's Husband", "Relatives"
	RelationToCustomer string             `bson:"relation_to_customer,omitempty" json:"relationToCustomer"`
	CustomerID         primitive.ObjectID `bson:"customer_id" json:"customerId"`
	VerificationStatus string             `bson:"verification_status" json:"verificationStatus"`
	CreatedAt          time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt          time.Time          `bson:"updated_at" json:"updatedAt"`
}
