package middleware

import (
	"net/http"

	"github.com/your-org/rana-awais-backend/config"
)

// CORSMiddleware handles CORS with configurable allowed origins
func CORSMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Check if origin is allowed
			allowed := false
			allowedOrigins := []string{cfg.FrontendURL}

			// Add localhost for development
			if cfg.Environment == "development" {
				allowedOrigins = append(allowedOrigins, "http://localhost:3000", "http://localhost:3001", "http://localhost:8080")
			}

			for _, ao := range allowedOrigins {
				if origin == ao {
					allowed = true
					break
				}
			}

			// Allow all in development
			if cfg.Environment == "development" {
				allowed = true
			}

			if allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else if cfg.Environment == "development" {
				// Fallback for development
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept-Language")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Max-Age", "3600")

			// Preflight request ke liye turant 200 OK bhejo
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// CORSMiddlewareSimple is a simplified version for testing
func CORSMiddlewareSimple(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept-Language")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
