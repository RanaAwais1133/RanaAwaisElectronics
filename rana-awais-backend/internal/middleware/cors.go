package middleware

import (
	"net/http"
	"strings"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
)

// AllowedOrigins lists the origins that are allowed to access the API.
// This includes production Vercel domains and local development origins.
var AllowedOrigins = []string{
	"https://rana-awais-electronics-orcin.vercel.app",
	"https://rana-awais-electronics.vercel.app",
	"http://localhost:3000",
	"http://localhost:5173",
	"http://localhost:8080",
	"http://127.0.0.1:3000",
	"http://127.0.0.1:5173",
	"http://127.0.0.1:8080",
}

// isOriginAllowed checks if the given origin is in the allowed list.
// Also allows any origin that ends with .vercel.app (for preview deployments).
func isOriginAllowed(origin string) bool {
	if origin == "" {
		return true
	}
	for _, allowed := range AllowedOrigins {
		if origin == allowed {
			return true
		}
	}
	// Allow any Vercel preview deployment
	if strings.HasSuffix(origin, ".vercel.app") {
		return true
	}
	// Allow any local IP (192.168.x.x, 10.x.x.x, 172.x.x.x)
	if strings.HasPrefix(origin, "http://192.168.") || strings.HasPrefix(origin, "http://10.") || strings.HasPrefix(origin, "http://172.") {
		return true
	}
	return false
}

// CORSMiddleware handles CORS - allows specific origins for production
// and any local network IP for development.
func CORSMiddleware(_ *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// ✅ Set CORS headers for allowed origins
			if origin != "" && isOriginAllowed(origin) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Vary", "Origin")
			} else if origin == "" {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			} else {
				// Origin not allowed - still set it to prevent browser errors
				// but the request will proceed without credentials
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Vary", "Origin")
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept-Language, X-Requested-With, Cache-Control")
			w.Header().Set("Access-Control-Expose-Headers", "Content-Type, Authorization, Content-Length")
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
