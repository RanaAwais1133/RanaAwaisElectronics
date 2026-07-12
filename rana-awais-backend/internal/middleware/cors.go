package middleware

import (
	"net/http"
	"strings"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
)

// SecurityHeaders adds security headers to all responses
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prevent MIME type sniffing
		w.Header().Set("X-Content-Type-Options", "nosniff")
		
		// Prevent clickjacking attacks
		w.Header().Set("X-Frame-Options", "DENY")
		
		// Enable XSS protection
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		
		// Force HTTPS (only in production)
		if cfg := config.APP_CONFIG; cfg != nil && cfg.Environment == "production" {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		
		// Control referrer information
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		
		// Prevent browser from caching sensitive data
		if r.URL.Path == "/api/login" || r.URL.Path == "/api/users" {
			w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
			w.Header().Set("Pragma", "no-cache")
			w.Header().Set("Expires", "0")
		}
		
		// Content Security Policy (basic)
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'")
		
		next.ServeHTTP(w, r)
	})
}

// AllowedOrigins lists the origins that are allowed to access the API.
// This includes production Vercel domains and local development origins.
var AllowedOrigins = []string{
	"https://farooq-autos-two.vercel.app",
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
	// Allow any local IP (192.168.x.x, 10.x.x.x, 172.x.x.x) for development
	if strings.HasPrefix(origin, "http://192.168.") || strings.HasPrefix(origin, "http://10.") || strings.HasPrefix(origin, "http://172.") {
		return true
	}
	// ❌ BLOCK all other origins - no wildcard allowing
	return false
}

// CORSMiddleware handles CORS - allows specific origins for production
// and any local network IP for development.
func CORSMiddleware(_ *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

		// ✅ Set CORS headers ONLY for allowed origins
		if origin != "" && isOriginAllowed(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Vary", "Origin")
		} else if origin == "" {
			// Allow same-origin requests
			w.Header().Set("Access-Control-Allow-Origin", "*")
		} else {
			// ❌ BLOCK unauthorized origins - reject the request
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte(`{"error":"origin not allowed","error_ur":"غیر مجاز رسائی"}`))
			return
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
