package middleware

import (
	"net/http"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
)

// CORSMiddleware handles CORS - allows all origins for local network access
// This is a desktop app used on local WiFi, not a public API.
// Mobile users access via local IP (e.g., http://192.168.x.x:8080)
func CORSMiddleware(_ *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// ✅ Echo back the origin for credentialed requests (needed for auth)
			// This allows any origin including mobile IPs on local network
			if origin != "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Vary", "Origin")
			} else {
				w.Header().Set("Access-Control-Allow-Origin", "*")
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
