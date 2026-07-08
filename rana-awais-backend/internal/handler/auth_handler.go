package handler

import (
	"encoding/json"
	"log"
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
	// ═══════════════════════════════════════════════════════════
	// 🔍 SUPER DETAILED LOGGING FOR MOBILE LOGIN DEBUG
	// ═══════════════════════════════════════════════════════════
	log.Printf("═══════════════════════════════════════════")
	log.Printf("🔐 LOGIN REQUEST RECEIVED")
	log.Printf("   📍 URL: %s", r.URL.String())
	log.Printf("   📍 Method: %s", r.Method)
	log.Printf("   📍 RemoteAddr: %s", r.RemoteAddr)
	log.Printf("   📍 Origin: %s", r.Header.Get("Origin"))
	log.Printf("   📍 Content-Type: %s", r.Header.Get("Content-Type"))
	log.Printf("   📍 User-Agent: %s", r.Header.Get("User-Agent"))
	log.Printf("   📍 Referer: %s", r.Header.Get("Referer"))
	log.Printf("   📍 Accept: %s", r.Header.Get("Accept"))
	log.Printf("   📍 Content-Length: %d", r.ContentLength)
	log.Printf("═══════════════════════════════════════════")

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ LOGIN ERROR: Invalid body: %v", err)
		respondError(w, r, http.StatusBadRequest, "Invalid body", "غلط مواد")
		return
	}

	log.Printf("   📝 Parsed body: username='%s' password='%s' (len=%d)", req.Username, req.Password, len(req.Password))

	if req.Username == "" || req.Password == "" {
		log.Printf("❌ LOGIN ERROR: Empty username or password")
		respondError(w, r, http.StatusBadRequest, "Username and password required", "صارف نام اور پاس ورڈ ضروری ہیں")
		return
	}

	log.Printf("🔐 LOGIN ATTEMPT: username=%s from IP=%s", req.Username, r.RemoteAddr)

	user, err := h.userSvc.Authenticate(r.Context(), req.Username, req.Password)
	if err != nil {
		log.Printf("❌ LOGIN FAILED: username=%s error=%v", req.Username, err)
		respondError(w, r, http.StatusUnauthorized, "Invalid credentials", "غلط صارف یا پاس ورڈ")
		return
	}

	log.Printf("✅ LOGIN SUCCESS: username=%s role=%s id=%s", req.Username, user.Role, user.ID)

	// Create JWT token with claims
	claims := jwt.MapClaims{
		"sub":  user.ID,
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
			"id":          user.ID,
			"username":    user.Username,
			"role":        user.Role,
			"displayName": user.DisplayName,
		},
	})
}

// LoginDebug is a diagnostic endpoint that returns detailed error info
// for debugging login issues from mobile browsers.
func (h *AuthHandler) LoginDebug(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"success": false,
			"error":   "Invalid request body: " + err.Error(),
			"hint":    "Make sure you're sending JSON with 'username' and 'password' fields",
		})
		return
	}

	if req.Username == "" || req.Password == "" {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"success": false,
			"error":   "Username or password is empty",
			"hint":    "Both 'username' and 'password' fields are required",
			"received": map[string]interface{}{
				"username": req.Username,
				"password": req.Password != "",
			},
		})
		return
	}

	// Try to find user in database
	user, err := h.userSvc.Authenticate(r.Context(), req.Username, req.Password)
	if err != nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"success": false,
			"error":   err.Error(),
			"hint":    "Default credentials: admin / admin123. Check caps lock and try again.",
			"debug": map[string]interface{}{
				"username": req.Username,
				"passwordProvided": req.Password != "",
			},
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Login successful!",
		"user": map[string]interface{}{
			"id":          user.ID,
			"username":    user.Username,
			"role":        user.Role,
			"displayName": user.DisplayName,
		},
	})
}
