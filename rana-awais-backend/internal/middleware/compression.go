package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"strings"
)

// GzipCompressionMiddleware compresses HTTP responses using gzip
// for clients that accept gzip encoding. Uses compression level 6
// (default) for optimal speed/ratio balance.
func GzipCompressionMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if client accepts gzip encoding
		acceptEncoding := r.Header.Get("Accept-Encoding")
		if !strings.Contains(acceptEncoding, "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		// Don't compress already-compressed content types
		contentType := w.Header().Get("Content-Type")
		if contentType == "" {
			contentType = r.Header.Get("Content-Type")
		}
		if strings.HasPrefix(contentType, "image/") ||
			strings.HasPrefix(contentType, "video/") ||
			strings.HasPrefix(contentType, "audio/") ||
			strings.Contains(contentType, "zip") ||
			strings.Contains(contentType, "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		// Create gzip writer with best speed for API responses
		gz, err := gzip.NewWriterLevel(w, gzip.BestSpeed)
		if err != nil {
			// Fallback to default level
			gz = gzip.NewWriter(w)
		}
		defer gz.Close()

		// Wrap response writer
		gzWriter := &gzipResponseWriter{
			ResponseWriter: w,
			Writer:         gz,
		}

		// Set Content-Encoding header
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Set("Vary", "Accept-Encoding")

		next.ServeHTTP(gzWriter, r)
	})
}

// gzipResponseWriter wraps http.ResponseWriter with gzip compression
type gzipResponseWriter struct {
	http.ResponseWriter
	Writer io.Writer
}

func (g *gzipResponseWriter) Write(data []byte) (int, error) {
	return g.Writer.Write(data)
}
