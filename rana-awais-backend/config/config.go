package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the backend.
type Config struct {
	// Server
	ServerPort  string `env:"SERVER_PORT" envDefault:"8080"`
	Environment string `env:"ENVIRONMENT" envDefault:"development"`
	FrontendURL string `env:"FRONTEND_URL" envDefault:"http://localhost:3000"`

	// Database
	MongoURI string `env:"MONGO_URI" envDefault:"mongodb://localhost:27017"`
	DBName   string `env:"DB_NAME" envDefault:"rana_awais_erp"`

	// Auth
	JWTSecret        string `env:"JWT_SECRET" envDefault:"change-me-in-production"`
	JWTExpiryHours   int    `env:"JWT_EXPIRY_HOURS" envDefault:"24"`
	AdminUsername    string `env:"ADMIN_USERNAME" envDefault:"admin"`
	AdminPassword    string `env:"ADMIN_PASSWORD" envDefault:"admin123"`
	AdminDisplayName string `env:"ADMIN_DISPLAY_NAME" envDefault:"Admin"`

	// App Details (Customizable)
	AppName       string `env:"APP_NAME" envDefault:"MY_SHOP_PPC"`
	CompanyName   string `env:"COMPANY_NAME" envDefault:"MY ELECTRONICS"`
	CompanyNameUr string `env:"COMPANY_NAME_UR" envDefault:"مائی الیکٹرانکس"`
	Address       string `env:"ADDRESS" envDefault:"Behari Colony, Disposal Chowk, Bismillah Service Station, Opposite Noor Super Store, Kacha Aiemanabad Road, Gujranwala"`
	AddressUr     string `env:"ADDRESS_UR" envDefault:"بہاری کالونی، ڈسپوزل چوک، بسم اللہ سروس اسٹیشن، نور سپر اسٹور کے سامنے، کچّہ ایمن آباد روڈ، گوجرانوالہ"`
	Phone1        string `env:"PHONE_1" envDefault:"0324-9959800"`
	Phone2        string `env:"PHONE_2" envDefault:"0319-6429407"`
	Phone3        string `env:"PHONE_3" envDefault:"0318-7311277"`
	SoftwareBy    string `env:"SOFTWARE_BY" envDefault:"Huzaifa (0313-6487199)"`
	SoftwareByUr  string `env:"SOFTWARE_BY_UR" envDefault:"حذیفہ (0313-6487199)"`

	// Integrations
	SMSEndpoint     string `env:"SMS_ENDPOINT" envDefault:""`
	WhatsAppAPI     string `env:"WHATSAPP_API" envDefault:""`
	ThermalEndpoint string `env:"THERMAL_ENDPOINT" envDefault:""`

	// Fine Settings
	FinePerDay      float64 `env:"FINE_PER_DAY" envDefault:"100"`
	FineMaxPercent  float64 `env:"FINE_MAX_PERCENT" envDefault:"50"` // Max fine = 50% of amount
	GracePeriodDays int     `env:"GRACE_PERIOD_DAYS" envDefault:"3"` // Grace period before fine starts
}

// Load reads configuration from environment variables (or a .env file).
func Load() *Config {
	// Try loading .env file first
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, checking system environment variables...")
	}

	cfg := &Config{
		ServerPort:       getEnv("SERVER_PORT", "8080"),
		Environment:      getEnv("ENVIRONMENT", "development"),
		FrontendURL:      getEnv("FRONTEND_URL", "http://localhost:3000"),
		MongoURI:         getEnv("MONGO_URI", "mongodb://localhost:27017"),
		DBName:           getEnv("DB_NAME", "rana_awais_erp"),
		JWTSecret:        getEnv("JWT_SECRET", "change-me-in-production"),
		JWTExpiryHours:   getEnvAsInt("JWT_EXPIRY_HOURS", 24),
		AdminUsername:    getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword:    getEnv("ADMIN_PASSWORD", "admin123"),
		AdminDisplayName: getEnv("ADMIN_DISPLAY_NAME", "Admin"),
		AppName:          getEnv("APP_NAME", "MY_SHOP_PPC"),
		CompanyName:      getEnv("COMPANY_NAME", "MY ELECTRONICS"),
		CompanyNameUr:    getEnv("COMPANY_NAME_UR", "مائی الیکٹرانکس"),
		Address:          getEnv("ADDRESS", "Behari Colony, Disposal Chowk, Bismillah Service Station, Opposite Noor Super Store, Kacha Aiemanabad Road, Gujranwala"),
		AddressUr:        getEnv("ADDRESS_UR", "بہاری کالونی، ڈسپوزل چوک، بسم اللہ سروس اسٹیشن، نور سپر اسٹور کے سامنے، کچّہ ایمن آباد روڈ، گوجرانوالہ"),
		Phone1:           getEnv("PHONE_1", "0324-9959800"),
		Phone2:           getEnv("PHONE_2", "0319-6429407"),
		Phone3:           getEnv("PHONE_3", "0318-7311277"),
		SoftwareBy:       getEnv("SOFTWARE_BY", "Huzaifa (0313-6487199)"),
		SoftwareByUr:     getEnv("SOFTWARE_BY_UR", "حذیفہ (0313-6487199)"),
		SMSEndpoint:      getEnv("SMS_ENDPOINT", ""),
		WhatsAppAPI:      getEnv("WHATSAPP_API", ""),
		ThermalEndpoint:  getEnv("THERMAL_ENDPOINT", ""),
		FinePerDay:       getEnvAsFloat("FINE_PER_DAY", 100),
		FineMaxPercent:   getEnvAsFloat("FINE_MAX_PERCENT", 50),
		GracePeriodDays:  getEnvAsInt("GRACE_PERIOD_DAYS", 3),
	}

	// Validate critical configuration
	if cfg.MongoURI == "mongodb://localhost:27017" {
		log.Println("⚠️  WARNING: Using default MongoDB URI (localhost). Make sure MONGO_URI is set in production!")
	}
	if cfg.JWTSecret == "change-me-in-production" {
		log.Println("⚠️  WARNING: Using default JWT_SECRET. Change this in production!")
	}

	log.Printf("✅ Configuration loaded: Server=%s, DB=%s, App=%s", cfg.ServerPort, cfg.DBName, cfg.AppName)
	return cfg
}

// getEnv returns the value of the environment variable key if set, otherwise fallback.
func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// getEnvAsInt returns the value of the environment variable as int, otherwise fallback.
func getEnvAsInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		var i int
		if _, err := fmt.Sscanf(v, "%d", &i); err == nil {
			return i
		}
	}
	return fallback
}

// getEnvAsFloat returns the value of the environment variable as float64, otherwise fallback.
func getEnvAsFloat(key string, fallback float64) float64 {
	if v := os.Getenv(key); v != "" {
		var f float64
		if _, err := fmt.Sscanf(v, "%f", &f); err == nil {
			return f
		}
	}
	return fallback
}

// GetMongoURI returns the MongoDB URI with masked password for logging
func (c *Config) GetMongoURI() string {
	uri := c.MongoURI
	if len(uri) > 50 {
		return uri[:30] + "..." + uri[len(uri)-20:]
	}
	return uri
}

// GetPhoneNumbers returns all phone numbers as a slice
func (c *Config) GetPhoneNumbers() []string {
	return []string{c.Phone1, c.Phone2, c.Phone3}
}

// GetCompanyInfo returns company information for receipts
func (c *Config) GetCompanyInfo() map[string]string {
	return map[string]string{
		"appName":       c.AppName,
		"companyName":   c.CompanyName,
		"companyNameUr": c.CompanyNameUr,
		"address":       c.Address,
		"addressUr":     c.AddressUr,
		"phone1":        c.Phone1,
		"phone2":        c.Phone2,
		"phone3":        c.Phone3,
		"softwareBy":    c.SoftwareBy,
		"softwareByUr":  c.SoftwareByUr,
	}
}
