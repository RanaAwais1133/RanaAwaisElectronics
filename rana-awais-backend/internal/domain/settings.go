package domain

import "time"

// Setting represents a key-value setting
type Setting struct {
	Key       string    `json:"key" bson:"key"`
	Value     string    `json:"value" bson:"value"`
	UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`
}

// License represents a software license
type License struct {
	LicenseKey string    `json:"license_key" bson:"license_key"`
	ClientName string    `json:"client_name" bson:"client_name"`
	ExpiryDate string    `json:"expiry_date" bson:"expiry_date"`
	IsActive   int       `json:"is_active" bson:"is_active"`
	CreatedAt  time.Time `json:"created_at" bson:"created_at"`
}

// AuditLog represents an audit log entry
type AuditLog struct {
	ID        int       `json:"_id" bson:"_id"`
	Action    string    `json:"action" bson:"action"`
	Entity    string    `json:"entity" bson:"entity"`
	EntityID  string    `json:"entity_id" bson:"entity_id"`
	UserID    string    `json:"user_id" bson:"user_id"`
	Timestamp time.Time `json:"timestamp" bson:"timestamp"`
	Details   string    `json:"details" bson:"details"`
	UserName  string    `json:"user_name,omitempty" bson:"user_name,omitempty"`
}
