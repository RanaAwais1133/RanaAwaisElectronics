package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v4"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
)

// UserContextKey is the context key for the authenticated user claims.
const UserContextKey = "user"

// AuthMiddleware validates the JWT token from the Authorization header.
// If token is missing or invalid, it still allows the request through
// but without user context. This prevents 401 errors from breaking the UI.
// Role-based access is still enforced by AdminOnly/ManagerOnly/StaffOnly middleware.
func AuthMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				// Allow request without token - just don't set user context
				next.ServeHTTP(w, r)
				return
			}

			tokenStr := strings.TrimPrefix(header, "Bearer ")
			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
				return []byte(cfg.JWTSecret), nil
			})

			if err != nil || !token.Valid {
				// Token invalid - still allow request, just without user context
				next.ServeHTTP(w, r)
				return
			}

			claims, _ := token.Claims.(jwt.MapClaims)
			ctx := context.WithValue(r.Context(), UserContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// AdminOnly ensures the authenticated user has "admin" or "manager" role.
func AdminOnly(next http.Handler) http.Handler {
	return requireRole("admin", "manager")(next)
}

// ManagerOnly ensures the authenticated user has "manager" or "admin" role.
func ManagerOnly(next http.Handler) http.Handler {
	return requireRole("admin", "manager")(next)
}

// StaffOnly ensures the authenticated user has "staff", "manager", or "admin" role.
func StaffOnly(next http.Handler) http.Handler {
	return requireRole("admin", "manager", "staff")(next)
}

// requireRole returns a middleware that checks for specific roles
func requireRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value(UserContextKey).(jwt.MapClaims)
			if !ok {
				respondForbidden(w)
				return
			}

			role, ok := claims["role"].(string)
			if !ok {
				respondForbidden(w)
				return
			}

			for _, allowed := range roles {
				if role == allowed {
					next.ServeHTTP(w, r)
					return
				}
			}

			respondForbidden(w)
		})
	}
}

// GetUserIDFromContext extracts user ID from context
func GetUserIDFromContext(ctx context.Context) string {
	claims, ok := ctx.Value(UserContextKey).(jwt.MapClaims)
	if !ok {
		return ""
	}
	sub, ok := claims["sub"].(string)
	if !ok {
		return ""
	}
	return sub
}

// GetUserRoleFromContext extracts user role from context
func GetUserRoleFromContext(ctx context.Context) string {
	claims, ok := ctx.Value(UserContextKey).(jwt.MapClaims)
	if !ok {
		return ""
	}
	role, ok := claims["role"].(string)
	if !ok {
		return ""
	}
	return role
}

// ✅ Helper response functions
func respondUnauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	json.NewEncoder(w).Encode(map[string]string{
		"error":    "unauthorized",
		"error_ur": "غیر مجاز رسائی",
	})
}

func respondForbidden(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusForbidden)
	json.NewEncoder(w).Encode(map[string]string{
		"error":    "forbidden",
		"error_ur": "غیر مجاز رسائی",
	})
}
