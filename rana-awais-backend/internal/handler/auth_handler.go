package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
)

type AuthHandler struct {
	userSvc *service.UserService
	cfg     *config.Config
}

func NewAuthHandler(userSvc *service.UserService, cfg *config.Config) *AuthHandler {
	return &AuthHandler{userSvc: userSvc, cfg: cfg}
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Login authenticates a user and returns a JWT token.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}

	if req.Username == "" || req.Password == "" {
		respondError(w, r, http.StatusBadRequest, "Username and password required", "صارف نام اور پاس ورڈ ضروری ہیں")
		return
	}

	user, err := h.userSvc.Authenticate(r.Context(), req.Username, req.Password)
	if err != nil {
		respondError(w, r, http.StatusUnauthorized, "Invalid credentials", "غلط صارف یا پاس ورڈ")
		return
	}

	// Create JWT token with claims
	claims := jwt.MapClaims{
		"sub":  user.ID.Hex(),
		"role": user.Role,
		"exp":  time.Now().Add(time.Duration(h.cfg.JWTExpiryHours) * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(h.cfg.JWTSecret))
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Token generation failed", "ٹوکن بنانے میں ناکامی")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"token": tokenStr,
		"user": map[string]interface{}{
			"id":          user.ID.Hex(),
			"username":    user.Username,
			"role":        user.Role,
			"displayName": user.DisplayName,
		},
	})
}
