package middleware

import (
	"fmt"
	"log"
	"net/http"
	"time"
)

// StartKeepAlive starts a goroutine that pings the server's own health endpoint
// every 5 minutes during business hours (9 AM to 12 AM) to prevent Render's
// free tier from putting the server to sleep due to inactivity.
//
// Render free tier spins down after 15 minutes of inactivity.
// This keep-alive ensures the server stays warm during business hours.
func StartKeepAlive(port string) {
	// Give the server a moment to start up
	time.Sleep(5 * time.Second)

	url := fmt.Sprintf("http://localhost:%s/api/health", port)
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	log.Println("⏰ Keep-Alive: Starting scheduler (9AM-12AM, every 5 min)")

	// Run immediately on startup
	pingServer(url, client)

	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()
		hour := now.Hour()

		// Business hours: 9 AM (9) to 12 AM (0) — i.e., 9 to 23, and 0
		// Actually: 9 AM to 12 AM midnight = hours 9 through 23
		if hour >= 9 && hour < 24 {
			pingServer(url, client)
		} else {
			log.Printf("⏰ Keep-Alive: Outside business hours (hour=%d), skipping ping", hour)
		}
	}
}

func pingServer(url string, client *http.Client) {
	resp, err := client.Get(url)
	if err != nil {
		log.Printf("⏰ Keep-Alive: Ping failed: %v", err)
		return
	}
	defer resp.Body.Close()
	log.Printf("⏰ Keep-Alive: Server pinged successfully (status=%d)", resp.StatusCode)
}
