package domain

import (
    "time"
    "go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
    ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    Username     string             `bson:"username" json:"username"`
    PasswordHash string             `bson:"password_hash" json:"-"`
    Role         string             `bson:"role" json:"role"`         // "admin", "manager", "staff", "recovery_officer"
    DisplayName  string             `bson:"display_name" json:"displayName"`
    DisplayNameUr string            `bson:"display_name_ur,omitempty" json:"displayNameUr,omitempty"` // ✅ NEW
    Phone        string             `bson:"phone,omitempty" json:"phone,omitempty"`                  // ✅ NEW
    CreatedAt    time.Time          `bson:"created_at" json:"createdAt"`
    UpdatedAt    time.Time          `bson:"updated_at" json:"updatedAt"`
}
