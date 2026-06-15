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
	GuarantorIDs []primitive.ObjectID `bson:"guarantor_ids,omitempty" json:"guarantorIds"`
	CreatedAt    time.Time            `bson:"created_at" json:"createdAt"`
	UpdatedAt    time.Time            `bson:"updated_at" json:"updatedAt"`
}