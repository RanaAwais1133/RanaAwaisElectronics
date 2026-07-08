// ═══════════════════════════════════════════════════════════════
// ✅ Rana Awais Electronics - SSE (Server-Sent Events) Hub
// ✅ Real-time event broadcasting to all connected clients
// ✅ Auto-cleanup of disconnected clients
// ═══════════════════════════════════════════════════════════════

package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
)

// SSEHub manages all SSE client connections and broadcasts events
type SSEHub struct {
	mu      sync.RWMutex
	clients map[string]chan SSEEvent
}

// SSEEvent represents a server-sent event
type SSEEvent struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// Global SSE hub instance
var GlobalSSEHub = NewSSEHub()

// NewSSEHub creates a new SSE hub
func NewSSEHub() *SSEHub {
	return &SSEHub{
		clients: make(map[string]chan SSEEvent),
	}
}

// Subscribe adds a new client and returns a channel for events
func (h *SSEHub) Subscribe(clientID string) chan SSEEvent {
	h.mu.Lock()
	defer h.mu.Unlock()

	ch := make(chan SSEEvent, 50) // Buffered channel to prevent blocking
	h.clients[clientID] = ch
	log.Printf("📡 SSE client connected: %s (total: %d)", clientID, len(h.clients))
	return ch
}

// Unsubscribe removes a client
func (h *SSEHub) Unsubscribe(clientID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if ch, ok := h.clients[clientID]; ok {
		close(ch)
		delete(h.clients, clientID)
		log.Printf("📡 SSE client disconnected: %s (total: %d)", clientID, len(h.clients))
	}
}

// Broadcast sends an event to all connected clients
func (h *SSEHub) Broadcast(eventType string, payload interface{}) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	event := SSEEvent{
		Type:    eventType,
		Payload: payload,
	}

	for clientID, ch := range h.clients {
		select {
		case ch <- event:
			// Successfully sent
		default:
			// Client channel full, skip (client might be slow)
			log.Printf("⚠️ SSE client %s channel full, skipping event", clientID)
		}
	}
}

// ClientCount returns the number of connected clients
func (h *SSEHub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// SSEHandler handles the SSE connection endpoint
func (h *SSEHub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Verify authentication via query param token
	tokenStr := r.URL.Query().Get("token")
	if tokenStr == "" {
		http.Error(w, "Unauthorized: token required", http.StatusUnauthorized)
		return
	}

	// Validate JWT token
	cfg := config.Load()
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		return []byte(cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("X-Accel-Buffering", "no")

	// Create a unique client ID
	clientID := fmt.Sprintf("%s-%d", r.RemoteAddr, time.Now().UnixNano())

	// Subscribe to events
	eventCh := h.Subscribe(clientID)

	// Ensure cleanup on disconnect
	defer h.Unsubscribe(clientID)

	// Send initial connection event
	fmt.Fprintf(w, "event: connected\ndata: {\"status\":\"connected\",\"clientId\":\"%s\"}\n\n", clientID)
	w.(http.Flusher).Flush()

	// Keep-alive ticker (send ping every 30 seconds)
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case event, ok := <-eventCh:
			if !ok {
				// Channel closed, client disconnected
				return
			}
			data, err := json.Marshal(event.Payload)
			if err != nil {
				continue
			}
			// Send event in SSE format
			_, err = fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.Type, string(data))
			if err != nil {
				return
			}
			w.(http.Flusher).Flush()

		case <-ticker.C:
			// Send keep-alive ping
			_, err := fmt.Fprintf(w, "event: ping\ndata: {}\n\n")
			if err != nil {
				return
			}
			w.(http.Flusher).Flush()

		case <-r.Context().Done():
			// Client disconnected
			return
		}
	}
}

// BroadcastProductEvent sends a product-related SSE event to all clients
func BroadcastProductEvent(eventType string, productID string, product interface{}) {
	GlobalSSEHub.Broadcast(eventType, map[string]interface{}{
		"id":        productID,
		"product":   product,
		"timestamp": time.Now().Unix(),
	})
}

// BroadcastStockEvent sends a stock-related SSE event to all clients
func BroadcastStockEvent(productID string, quantity int, product interface{}) {
	GlobalSSEHub.Broadcast("stock_added", map[string]interface{}{
		"id":        productID,
		"quantity":  quantity,
		"product":   product,
		"timestamp": time.Now().Unix(),
	})
}
