package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuditLog struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Action    string             `bson:"action" json:"action"`
	Entity    string             `bson:"entity" json:"entity"`
	EntityID  string             `bson:"entity_id,omitempty" json:"entityId,omitempty"`
	UserID    string             `bson:"user_id,omitempty" json:"userId,omitempty"`
	Timestamp time.Time          `bson:"timestamp" json:"timestamp"`
	Details   string             `bson:"details,omitempty" json:"details,omitempty"`
}