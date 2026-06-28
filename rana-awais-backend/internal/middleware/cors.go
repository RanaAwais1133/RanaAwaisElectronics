package middleware

import (
	"net/http"
	"strings"

	"github.com/your-org/rana-awais-backend/config"
)

// CORSMiddleware handles CORS with configurable allowed origins
func CORSMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	allowedOrigins := buildAllowedOrigins(cfg)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Set CORS headers based on allowed origins
			if isOriginAllowed(origin, allowedOrigins) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			} else if origin == "" {
				// Same-origin request (no Origin header)
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}
			// Note: Invalid origins get no CORS headers (browser blocks automatically)

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept-Language")
			w.Header().Set("Access-Control-Max-Age", "3600")

			// Handle preflight
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// CORSMiddlewareSimple allows all origins (use only for testing)
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

// buildAllowedOrigins creates the list of allowed origins from config
func buildAllowedOrigins(cfg *config.Config) []string {
	origins := []string{cfg.FrontendURL}

	// Add localhost URLs for development
	if cfg.Environment == "development" {
		origins = append(origins,
			"http://localhost:3000",
			"http://localhost:3001",
			"http://localhost:5173", // Vite default
		)
	}

	return origins
}

// isOriginAllowed checks if an origin is in the allowed list
func isOriginAllowed(origin string, allowedOrigins []string) bool {
	for _, allowed := range allowedOrigins {
		if strings.EqualFold(origin, allowed) {
			return true
		}
	}
	return false
}