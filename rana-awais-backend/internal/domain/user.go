package domain

import (
	"time"
)

type User struct {
	ID            string    `json:"id" bson:"_id"`
	Username      string    `json:"username" bson:"username"`
	PasswordHash  string    `json:"-" bson:"passwordhash"`
	Role          string    `json:"role" bson:"role"`
	DisplayName   string    `json:"displayName" bson:"displayname"`
	DisplayNameUr string    `json:"displayNameUr,omitempty" bson:"displaynameur,omitempty"`
	Phone         string    `json:"phone,omitempty" bson:"phone,omitempty"`
	CreatedAt     time.Time `json:"createdAt" bson:"createdat"`
	UpdatedAt     time.Time `json:"updatedAt" bson:"updatedat"`
}
