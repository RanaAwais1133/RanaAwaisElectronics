package audit

import (
	"context"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
)

type LogEntry struct {
	Action    string    `json:"action" bson:"action"`
	Entity    string    `json:"entity" bson:"entity"`
	EntityID  string    `json:"entity_id,omitempty" bson:"entity_id,omitempty"`
	UserID    string    `json:"user_id,omitempty" bson:"user_id,omitempty"`
	Timestamp time.Time `json:"timestamp" bson:"timestamp"`
	Details   string    `json:"details,omitempty" bson:"details,omitempty"`
}

func Log(ctx context.Context, action, entity, entityID, details string, userID ...string) error {
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
	}

	entry := LogEntry{
		Action:    action,
		Entity:    entity,
		EntityID:  entityID,
		Timestamp: time.Now().UTC(),
		Details:   details,
	}

	if len(userID) > 0 && userID[0] != "" {
		entry.UserID = userID[0]
	} else {
		if claims, ok := ctx.Value("user").(jwt.MapClaims); ok {
			if sub, ok := claims["sub"].(string); ok {
				entry.UserID = sub
			}
		}
	}

	// Try MongoDB first
	if config.MongoDatabase != nil {
		_, err := config.MongoDatabase.Collection("audit_logs").InsertOne(ctx, entry)
		if err == nil {
			return nil
		}
		log.Printf("[AUDIT MONGO ERROR] action=%s entity=%s entityID=%s err=%v", action, entity, entityID, err)
	}

	// Fallback to SQLite
	_, err := config.DB.ExecContext(ctx,
		`INSERT INTO audit_logs (action, entity, entity_id, user_id, timestamp, details) VALUES (?, ?, ?, ?, ?, ?)`,
		entry.Action, entry.Entity, entry.EntityID, entry.UserID, entry.Timestamp, entry.Details)
	if err != nil {
		log.Printf("[AUDIT SQLITE ERROR] action=%s entity=%s entityID=%s err=%v", action, entity, entityID, err)
	}
	return err
}
