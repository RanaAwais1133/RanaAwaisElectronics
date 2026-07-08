package domain

import "time"

// Expense represents a business expense
type Expense struct {
	ID              string    `json:"id" bson:"_id"`
	Description     string    `json:"description" bson:"description"`
	DescriptionUrdu string    `json:"descriptionUrdu,omitempty" bson:"description_urdu,omitempty"`
	Amount          float64   `json:"amount" bson:"amount"`
	Category        string    `json:"category" bson:"category"`
	Date            time.Time `json:"date" bson:"date"`
	PaidBy          string    `json:"paid_by,omitempty" bson:"paid_by,omitempty"`
	Notes           string    `json:"notes,omitempty" bson:"notes,omitempty"`
	CreatedAt       time.Time `json:"created_at" bson:"created_at"`
}
