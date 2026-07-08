package domain

import (
	"time"
)

type User struct {
	ID            string    `json:"id"`
	Username      string    `json:"username"`
	PasswordHash  string    `json:"-"`
	Role          string    `json:"role"`
	DisplayName   string    `json:"displayName"`
	DisplayNameUr string    `json:"displayNameUr,omitempty"`
	Phone         string    `json:"phone,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}
