package audit

import (
	"context"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/your-org/rana-awais-backend/config"
)

// LogEntry represents a single audit record.
type LogEntry struct {
	Action    string    `bson:"action"`
	Entity    string    `bson:"entity"`
	EntityID  string    `bson:"entity_id,omitempty"`
	UserID    string    `bson:"user_id,omitempty"`
	Timestamp time.Time `bson:"timestamp"`
	Details   string    `bson:"details,omitempty"`
}

// Log inserts an audit entry into the database.
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

	// ✅ Pehle explicit userID check karo
	if len(userID) > 0 && userID[0] != "" {
		entry.UserID = userID[0]
	} else {
		// ✅ String key "user" se context access karo
		if claims, ok := ctx.Value("user").(jwt.MapClaims); ok {
			if sub, ok := claims["sub"].(string); ok {
				entry.UserID = sub
			}
		}
	}

	_, err := config.DB.Collection("audit_logs").InsertOne(ctx, entry)
	if err != nil {
		log.Printf("[AUDIT ERROR] action=%s entity=%s entityID=%s err=%v", action, entity, entityID, err)
		return err
	}
	return nil
}