package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the Rana Awais ERP backend.
type Config struct {
	ServerPort      string
	MongoURI        string
	DBName          string
	JWTSecret       string
	SMSEndpoint     string
	WhatsAppAPI     string
	ThermalEndpoint string
}

// Load reads configuration from environment variables (or a .env file).
func Load() *Config {
	// Try loading .env file first
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, checking system environment variables...")
	}

	cfg := &Config{
		ServerPort:      getEnv("SERVER_PORT", "8080"),
		MongoURI:        getEnv("MONGO_URI", "mongodb://localhost:27017"),
		DBName:          getEnv("DB_NAME", "rana_awais_erp"),
		JWTSecret:       getEnv("JWT_SECRET", "change-me-in-production"),
		SMSEndpoint:     getEnv("SMS_ENDPOINT", ""),
		WhatsAppAPI:     getEnv("WHATSAPP_API", ""),
		ThermalEndpoint: getEnv("THERMAL_ENDPOINT", ""),
	}

	// Validate critical configuration
	if cfg.MongoURI == "mongodb://localhost:27017" {
		log.Println("⚠️  WARNING: Using default MongoDB URI (localhost). Make sure MONGO_URI is set in production!")
	}
	if cfg.JWTSecret == "change-me-in-production" {
		log.Println("⚠️  WARNING: Using default JWT_SECRET. Change this in production!")
	}

	log.Printf("✅ Configuration loaded: Server=%s, DB=%s", cfg.ServerPort, cfg.DBName)
	return cfg
}

// getEnv returns the value of the environment variable key if set, otherwise fallback.
func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// GetMongoURI returns the MongoDB URI with masked password for logging
func (c *Config) GetMongoURI() string {
	// Simple masking - don't log the full URI with password
	uri := c.MongoURI
	if len(uri) > 50 {
		return uri[:30] + "..." + uri[len(uri)-20:]
	}
	return uri
}


