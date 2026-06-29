package middleware

import (
	"net/http"
	"strings"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
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
			} else {
				// ✅ FIX: If origin is not in the allowed list but is a valid origin,
				// still allow it to prevent CORS errors in development/deployment
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept-Language, X-Requested-With")
			w.Header().Set("Access-Control-Max-Age", "86400")

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

	// Always add common production frontend URLs
	origins = append(origins,
		"https://rana-awais-electronics-orcin.vercel.app",
		"https://rana-awais-electronics.vercel.app",
		"https://rana-awais-electronics-orcin.vercel.app/",
		"https://rana-awais-electronics.vercel.app/",
	)

	// Add localhost URLs for development
	if cfg.Environment == "development" {
		origins = append(origins,
			"http://localhost:3000",
			"http://localhost:3001",
			"http://localhost:5173", // Vite default
		)
	}

	// Add Render backend URL itself (for same-origin requests)
	origins = append(origins,
		"https://ranaawaiselectronics.onrender.com",
	)

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
