package cache

import (
	"log"
	"sync"
	"time"
)

// Item represents a cached item with TTL
type Item struct {
	Data      interface{}
	ExpiresAt time.Time
}

// Cache provides a thread-safe in-memory cache with TTL
type Cache struct {
	mu       sync.RWMutex
	items    map[string]*Item
	defaultTTL time.Duration
	hitCount  int64
	missCount int64
}

// New creates a new cache with the given default TTL
func New(defaultTTL time.Duration) *Cache {
	c := &Cache{
		items:      make(map[string]*Item),
		defaultTTL: defaultTTL,
	}
	go c.cleanup()
	return c
}

// Get retrieves a cached value
func (c *Cache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	item, found := c.items[key]
	c.mu.RUnlock()

	if !found {
		c.mu.Lock()
		c.missCount++
		c.mu.Unlock()
		return nil, false
	}

	if time.Now().After(item.ExpiresAt) {
		c.mu.Lock()
		delete(c.items, key)
		c.missCount++
		c.mu.Unlock()
		return nil, false
	}

	c.mu.Lock()
	c.hitCount++
	c.mu.Unlock()
	return item.Data, true
}

// Set stores a value with the default TTL
func (c *Cache) Set(key string, data interface{}) {
	c.SetWithTTL(key, data, c.defaultTTL)
}

// SetWithTTL stores a value with a specific TTL
func (c *Cache) SetWithTTL(key string, data interface{}, ttl time.Duration) {
	c.mu.Lock()
	c.items[key] = &Item{
		Data:      data,
		ExpiresAt: time.Now().Add(ttl),
	}
	c.mu.Unlock()
}

// Delete removes a key from cache
func (c *Cache) Delete(key string) {
	c.mu.Lock()
	delete(c.items, key)
	c.mu.Unlock()
}

// DeletePrefix removes all keys with the given prefix
func (c *Cache) DeletePrefix(prefix string) {
	c.mu.Lock()
	for k := range c.items {
		if len(k) >= len(prefix) && k[:len(prefix)] == prefix {
			delete(c.items, k)
		}
	}
	c.mu.Unlock()
}

// Clear removes all cached items
func (c *Cache) Clear() {
	c.mu.Lock()
	c.items = make(map[string]*Item)
	c.mu.Unlock()
}

// Stats returns cache hit/miss statistics
func (c *Cache) Stats() (hits, misses int64) {
	c.mu.RLock()
	hits = c.hitCount
	misses = c.missCount
	c.mu.RUnlock()
	return
}

// cleanup periodically removes expired entries
func (c *Cache) cleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for k, v := range c.items {
			if now.After(v.ExpiresAt) {
				delete(c.items, k)
			}
		}
		c.mu.Unlock()
	}
}

// ========== GLOBAL CACHE INSTANCES ==========

// DashboardSummaryCache caches dashboard summary for 30 seconds
var DashboardSummaryCache = New(30 * time.Second)

// DashboardDetailCache caches dashboard detail endpoints for 15 seconds
var DashboardDetailCache = New(15 * time.Second)

// EntityCache caches entity lists (customers, products, etc.) for 60 seconds
var EntityCache = New(60 * time.Second)

// AuditCache caches audit logs for 10 seconds
var AuditCache = New(10 * time.Second)

// InvalidateOnMutation clears relevant caches when data changes
func InvalidateOnMutation(entityType string) {
	switch entityType {
	case "customer", "customers":
		EntityCache.DeletePrefix("/customers")
		DashboardSummaryCache.Clear()
		DashboardDetailCache.Clear()
	case "product", "products":
		EntityCache.DeletePrefix("/products")
		DashboardSummaryCache.Clear()
	case "installment", "installments", "payment", "payments":
		DashboardSummaryCache.Clear()
		DashboardDetailCache.Clear()
		EntityCache.DeletePrefix("/installments")
		EntityCache.DeletePrefix("/payments")
	case "inventory":
		DashboardSummaryCache.Clear()
		EntityCache.DeletePrefix("/inventory")
	case "expense", "expenses":
		DashboardSummaryCache.Clear()
		EntityCache.DeletePrefix("/expenses")
	default:
		DashboardSummaryCache.Clear()
		DashboardDetailCache.Clear()
	}
	log.Printf("[CACHE] Invalidated caches for entity: %s", entityType)
}
