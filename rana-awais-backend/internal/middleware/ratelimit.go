package middleware

import (
	"net/http"
	"sync"
	"time"
)

// RateLimiter provides simple per-IP rate limiting
type RateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	limit    int
	window   time.Duration
}

type visitor struct {
	count    int
	lastSeen time.Time
}

// NewRateLimiter creates a new rate limiter with given limit per time window
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		limit:    limit,
		window:   window,
	}
	go rl.cleanup()
	return rl
}

func (rl *RateLimiter) cleanup() {
	for {
		time.Sleep(time.Minute)
		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastSeen) > rl.window*2 {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// RateLimit middleware limits requests per IP
func (rl *RateLimiter) RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get real IP from headers (for proxy/load balancer)
		ip := r.Header.Get("X-Forwarded-For")
		if ip == "" {
			ip = r.Header.Get("X-Real-IP")
		}
		if ip == "" {
			ip = r.RemoteAddr
		}

		rl.mu.Lock()
		defer rl.mu.Unlock()

		v, exists := rl.visitors[ip]
		if !exists {
			rl.visitors[ip] = &visitor{count: 1, lastSeen: time.Now()}
			next.ServeHTTP(w, r)
			return
		}

		// Reset if window has passed
		if time.Since(v.lastSeen) > rl.window {
			v.count = 1
			v.lastSeen = time.Now()
			next.ServeHTTP(w, r)
			return
		}

		v.count++
		v.lastSeen = time.Now()

		if v.count > rl.limit {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Retry-After", "60")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{
				"error": "rate limit exceeded", 
				"error_ur": "بہت زیادہ درخواستوں کی حد پار کر دی گئی ہے۔ براہ کرم 60 سیکنڈ بعد دوبارہ کوشش کریں"
			}`))
			return
		}

		next.ServeHTTP(w, r)
	})
}

// GetRateLimitInfo returns current rate limit info for an IP
func (rl *RateLimiter) GetRateLimitInfo(ip string) (count int, remaining int, resetTime time.Time) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		return 0, rl.limit, time.Now().Add(rl.window)
	}

	resetTime = v.lastSeen.Add(rl.window)
	
	// ✅ FIX: Calculate remaining properly (never negative)
	remaining = rl.limit - v.count
	if remaining < 0 {
		remaining = 0
	}
	
	return v.count, remaining, resetTime
}

// ResetRateLimit resets rate limit for an IP
func (rl *RateLimiter) ResetRateLimit(ip string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	delete(rl.visitors, ip)
}

// ✅ NEW: GetCurrentLimit returns current rate limit value
func (rl *RateLimiter) GetCurrentLimit() int {
	return rl.limit
}

// ✅ NEW: UpdateLimit updates the rate limit dynamically
func (rl *RateLimiter) UpdateLimit(newLimit int) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	rl.limit = newLimit
}

// ✅ NEW: IsRateLimited checks if an IP is currently rate limited
func (rl *RateLimiter) IsRateLimited(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	
	v, exists := rl.visitors[ip]
	if !exists {
		return false
	}
	
	return v.count >= rl.limit
}
