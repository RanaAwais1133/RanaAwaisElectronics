package middleware

import (
	"bytes"
	"net/http"
	"sync"
	"time"
)

// CacheEntry holds cached response data
type CacheEntry struct {
	Data      []byte
	Headers   map[string]string
	ExpiresAt time.Time
}

// CacheMiddleware provides in-memory caching for API responses
type CacheMiddleware struct {
	mu    sync.RWMutex
	cache map[string]*CacheEntry
	ttl   time.Duration
}

// NewCacheMiddleware creates a new cache middleware
func NewCacheMiddleware(ttl time.Duration) *CacheMiddleware {
	c := &CacheMiddleware{
		cache: make(map[string]*CacheEntry),
		ttl:   ttl,
	}
	// Start cleanup goroutine
	go c.cleanup()
	return c
}

// CacheResponse caches GET responses for the specified duration
func (c *CacheMiddleware) CacheResponse(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only cache GET requests
		if r.Method != http.MethodGet {
			next.ServeHTTP(w, r)
			return
		}

		// Generate cache key from URL
		key := r.URL.RequestURI()

		// Check cache
		c.mu.RLock()
		entry, found := c.cache[key]
		c.mu.RUnlock()

		if found && time.Now().Before(entry.ExpiresAt) {
			// Serve from cache
			for k, v := range entry.Headers {
				w.Header().Set(k, v)
			}
			w.Header().Set("X-Cache", "HIT")
			w.Write(entry.Data)
			return
		}

		// Capture response
		crw := &cacheResponseWriter{
			ResponseWriter: w,
			body:           &bytes.Buffer{},
			headers:        make(map[string]string),
		}

		next.ServeHTTP(crw, r)

		// Only cache successful responses
		if crw.statusCode == http.StatusOK {
			c.mu.Lock()
			c.cache[key] = &CacheEntry{
				Data:      crw.body.Bytes(),
				Headers:   crw.headers,
				ExpiresAt: time.Now().Add(c.ttl),
			}
			c.mu.Unlock()
		}
	})
}

// Invalidate removes a specific key from cache
func (c *CacheMiddleware) Invalidate(key string) {
	c.mu.Lock()
	delete(c.cache, key)
	c.mu.Unlock()
}

// InvalidatePrefix removes all cache entries with the given prefix
func (c *CacheMiddleware) InvalidatePrefix(prefix string) {
	c.mu.Lock()
	for k := range c.cache {
		if len(k) >= len(prefix) && k[:len(prefix)] == prefix {
			delete(c.cache, k)
		}
	}
	c.mu.Unlock()
}

// cleanup periodically removes expired entries
func (c *CacheMiddleware) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for k, v := range c.cache {
			if now.After(v.ExpiresAt) {
				delete(c.cache, k)
			}
		}
		c.mu.Unlock()
	}
}

// cacheResponseWriter captures the response for caching
type cacheResponseWriter struct {
	http.ResponseWriter
	body       *bytes.Buffer
	headers    map[string]string
	statusCode int
}

func (c *cacheResponseWriter) WriteHeader(statusCode int) {
	c.statusCode = statusCode
	c.ResponseWriter.WriteHeader(statusCode)
}

func (c *cacheResponseWriter) Write(data []byte) (int, error) {
	// Capture headers
	for k, v := range c.ResponseWriter.Header() {
		if len(v) > 0 {
			c.headers[k] = v[0]
		}
	}
	c.body.Write(data)
	return c.ResponseWriter.Write(data)
}

// Helper to create a cache key from method and path
func CacheKey(method, path string) string {
	return method + ":" + path
}

// Global dashboard cache instance
var DashboardCache = NewCacheMiddleware(30 * time.Second) // 30s TTL for multi-client real-time sync


