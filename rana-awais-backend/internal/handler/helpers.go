package handler

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/middleware"
)

type errorResponse struct {
	Error   string `json:"error"`
	ErrorUr string `json:"errorUr,omitempty"`
}

func respondError(w http.ResponseWriter, r *http.Request, status int, enMsg, urMsg string) {
	lang := middleware.GetLang(r.Context())
	resp := errorResponse{Error: enMsg}
	if lang == "ur" && urMsg != "" {
		resp.Error = urMsg
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(resp)
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		json.NewEncoder(w).Encode(data)
	}
}

func getUserID(r *http.Request) string {
	if claims, ok := r.Context().Value("user").(jwt.MapClaims); ok {
		if sub, ok := claims["sub"].(string); ok {
			return sub
		}
	}
	return ""
}

func parseInt64(s string, defaultVal int64) int64 {
	if s == "" {
		return defaultVal
	}
	v, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return defaultVal
	}
	return v
}

func parseDateRange(r *http.Request) (time.Time, time.Time, error) {
	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")
	if startStr == "" || endStr == "" {
		return time.Time{}, time.Time{}, errors.New("start and end required")
	}
	start, err := time.Parse("2006-01-02", startStr)
	if err != nil {
		return time.Time{}, time.Time{}, errors.New("invalid start date")
	}
	end, err := time.Parse("2006-01-02", endStr)
	if err != nil {
		return time.Time{}, time.Time{}, errors.New("invalid end date")
	}
	return start, end, nil
}

// ═══════════════════════════════════════
// 📋 AUDIT LOG HELPER
// ═══════════════════════════════════════

// generateID creates a prefixed UUID-based ID (e.g., "EXP-abc123...")
func generateID(prefix string) string {
	return fmt.Sprintf("%s-%s", prefix, uuid.New().String()[:8])
}

// logAudit inserts an audit log entry into the database
func logAudit(db *sql.DB, action, entity, entityID, userID, details string) {
	if db == nil {
		return
	}
	_, err := db.Exec(
		"INSERT INTO audit_logs (action, entity, entity_id, user_id, timestamp, details) VALUES (?, ?, ?, ?, ?, ?)",
		action, entity, entityID, userID, time.Now(), details,
	)
	if err != nil {
		log.Printf("⚠️ Failed to insert audit log: %v", err)
	}
}
