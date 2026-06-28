package handler

import (
	"encoding/json"
	"net/http"

	"github.com/golang-jwt/jwt/v4"
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

// getUserID extracts user ID from JWT claims in request context
func getUserID(r *http.Request) string {
	if claims, ok := r.Context().Value("user").(jwt.MapClaims); ok {
		if sub, ok := claims["sub"].(string); ok {
			return sub
		}
	}
	return ""
}
