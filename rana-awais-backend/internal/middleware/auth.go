package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v4"
	"github.com/your-org/rana-awais-backend/config"
)

// UserContextKey is the context key for the authenticated user claims.
const UserContextKey = "user"

// AuthMiddleware validates the JWT token from the Authorization header.
func AuthMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{
					"error":    "unauthorized",
					"error_ur": "غیر مجاز رسائی",
				})
				return
			}
			tokenStr := strings.TrimPrefix(header, "Bearer ")
			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
				return []byte(cfg.JWTSecret), nil
			})
			if err != nil || !token.Valid {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{
					"error":    "unauthorized",
					"error_ur": "غیر مجاز رسائی",
				})
				return
			}
			claims, _ := token.Claims.(jwt.MapClaims)
			ctx := context.WithValue(r.Context(), UserContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// AdminOnly ensures the authenticated user has the "admin" role.
func AdminOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value(UserContextKey).(jwt.MapClaims)
		if !ok {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{
				"error":    "forbidden",
				"error_ur": "غیر مجاز رسائی",
			})
			return
		}
		
		role, ok := claims["role"].(string)
		if !ok || (role != "admin" && role != "manager") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{
				"error":    "forbidden",
				"error_ur": "غیر مجاز رسائی",
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ManagerOnly ensures the authenticated user has "manager" or "admin" role.
func ManagerOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value(UserContextKey).(jwt.MapClaims)
		if !ok {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{
				"error":    "forbidden",
				"error_ur": "غیر مجاز رسائی",
			})
			return
		}
		
		role, ok := claims["role"].(string)
		if !ok || (role != "admin" && role != "manager") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{
				"error":    "forbidden",
				"error_ur": "غیر مجاز رسائی",
			})
			return
		}
		next.ServeHTTP(w, r)
	})
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