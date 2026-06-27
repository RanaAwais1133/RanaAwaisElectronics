package middleware

import (
	"log"
	"net/http"
	"time"
)

// LoggerMiddleware logs each request's method, path, and duration.
func LoggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		
		// Create custom response writer to capture status code
		lw := &logResponseWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}
		
		next.ServeHTTP(lw, r)
		
		// Log with status code
		status := lw.statusCode
		statusStr := http.StatusText(status)
		log.Printf("[%s] %s %s - %v - %s - %d %s", 
			r.Method, 
			r.RequestURI, 
			r.RemoteAddr, 
			time.Since(start),
			r.Header.Get("Accept-Language"),
			status,
			statusStr,
		)
	})
}

// logResponseWriter wraps http.ResponseWriter to capture status code
type logResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (lw *logResponseWriter) WriteHeader(statusCode int) {
	lw.statusCode = statusCode
	lw.ResponseWriter.WriteHeader(statusCode)
}

// LoggerMiddlewareSimple is a simple version without status tracking
func LoggerMiddlewareSimple(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("[%s] %s %s - %v", r.Method, r.RequestURI, r.RemoteAddr, time.Since(start))
	})
}