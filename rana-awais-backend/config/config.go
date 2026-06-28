package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// ✅ Global APP_CONFIG instance — populated on Load()
var APP_CONFIG *Config

// Config holds all configuration for the backend.
type Config struct {
	// ═══════════════════════════════════════
	// 🖥️ SERVER
	// ═══════════════════════════════════════
	ServerPort        string `env:"SERVER_PORT" envDefault:"8080"`
	Environment       string `env:"ENVIRONMENT" envDefault:"development"`
	FrontendURL       string `env:"FRONTEND_URL" envDefault:"http://localhost:3000"`
	RateLimitRequests int    `env:"RATE_LIMIT_REQUESTS" envDefault:"100"`
	MaxBodySizeMB     int    `env:"MAX_BODY_SIZE_MB" envDefault:"10"`

	// ═══════════════════════════════════════
	// 🗄️ DATABASE
	// ═══════════════════════════════════════
	MongoURI string `env:"MONGO_URI" envDefault:"mongodb://localhost:27017"`
	DBName   string `env:"DB_NAME" envDefault:"rana_awais_erp"`

	// ═══════════════════════════════════════
	// 🔐 AUTH
	// ═══════════════════════════════════════
	JWTSecret        string `env:"JWT_SECRET" envDefault:"change-me-in-production"`
	JWTExpiryHours   int    `env:"JWT_EXPIRY_HOURS" envDefault:"24"`
	AdminUsername    string `env:"ADMIN_USERNAME" envDefault:"admin"`
	AdminPassword    string `env:"ADMIN_PASSWORD" envDefault:"admin123"`
	AdminDisplayName string `env:"ADMIN_DISPLAY_NAME" envDefault:"Admin"`

	// ═══════════════════════════════════════
	// 🏢 COMPANY DETAILS
	// ═══════════════════════════════════════
	AppName       string `env:"APP_NAME" envDefault:"MY_SHOP_PPC"`
	CompanyName   string `env:"COMPANY_NAME" envDefault:"MY ELECTRONICS"`
	CompanyNameUr string `env:"COMPANY_NAME_UR" envDefault:"مائی الیکٹرانکس"`
	BranchName    string `env:"BRANCH_NAME" envDefault:"SADIQ"`
	BranchNameUr  string `env:"BRANCH_NAME_UR" envDefault:"صادق"`
	Address       string `env:"ADDRESS" envDefault:"Behari Colony, Disposal Chowk, Bismillah Service Station, Opposite Noor Super Store, Kacha Aiemanabad Road, Gujranwala"`
	AddressUr     string `env:"ADDRESS_UR" envDefault:"بہاری کالونی، ڈسپوزل چوک، بسم اللہ سروس اسٹیشن، نور سپر اسٹور کے سامنے، کچّہ ایمن آباد روڈ، گوجرانوالہ"`

	// ═══════════════════════════════════════
	// 📞 CONTACT
	// ═══════════════════════════════════════
	Phones []string `env:"PHONES" envDefault:"0324-9959800,0319-6429407,0318-7311277"`

	// ═══════════════════════════════════════
	// 💻 SOFTWARE
	// ═══════════════════════════════════════
	SoftwareBy   string `env:"SOFTWARE_BY" envDefault:"Huzaifa (0313-6487199)"`
	SoftwareByUr string `env:"SOFTWARE_BY_UR" envDefault:"حذیفہ (0313-6487199)"`

	// ═══════════════════════════════════════
	// 📝 RECEIPT NOTES
	// ═══════════════════════════════════════
	InvoiceNote   string `env:"INVOICE_NOTE" envDefault:""`
	InvoiceNoteUr string `env:"INVOICE_NOTE_UR" envDefault:"نوٹ: مذکورہ بالا تفصیلات درست اور تصدیق شدہ ہیں۔"`
	ServiceNote   string `env:"SERVICE_NOTE" envDefault:""`
	ServiceNoteUr string `env:"SERVICE_NOTE_UR" envDefault:"سروس چارجز میں صرف ایڈوانس شامل ہے"`

	// ═══════════════════════════════════════
	// 🔗 INTEGRATIONS
	// ═══════════════════════════════════════
	SMSEndpoint     string `env:"SMS_ENDPOINT" envDefault:""`
	WhatsAppAPI     string `env:"WHATSAPP_API" envDefault:""`
	ThermalEndpoint string `env:"THERMAL_ENDPOINT" envDefault:""`

	// ═══════════════════════════════════════
	// 💰 FINE SETTINGS
	// ═══════════════════════════════════════
	FinePerDay      float64 `env:"FINE_PER_DAY" envDefault:"100"`
	FineMaxPercent  float64 `env:"FINE_MAX_PERCENT" envDefault:"50"`
	GracePeriodDays int     `env:"GRACE_PERIOD_DAYS" envDefault:"3"`
}

// ═══════════════════════════════════════
// 📋 LOAD CONFIGURATION
// ═══════════════════════════════════════

// Load reads configuration from environment variables (or a .env file).
func Load() *Config {
	// Try loading .env file first
	if err := godotenv.Load(); err != nil {
		log.Println("ℹ️  No .env file found, using system environment variables...")
	}

	// Parse phones from comma-separated string
	phonesStr := getEnv("PHONES", "0324-9959800,0319-6429407,0318-7311277")
	phones := parsePhones(phonesStr)

	cfg := &Config{
		// Server
		ServerPort:        getEnv("SERVER_PORT", "8080"),
		Environment:       getEnv("ENVIRONMENT", "development"),
		FrontendURL:       getEnv("FRONTEND_URL", "http://localhost:3000"),
		RateLimitRequests: getEnvAsInt("RATE_LIMIT_REQUESTS", 100),
		MaxBodySizeMB:     getEnvAsInt("MAX_BODY_SIZE_MB", 10),

		// Database
		MongoURI: getEnv("MONGO_URI", "mongodb://localhost:27017"),
		DBName:   getEnv("DB_NAME", "rana_awais_erp"),

		// Auth
		JWTSecret:        getEnv("JWT_SECRET", "change-me-in-production"),
		JWTExpiryHours:   getEnvAsInt("JWT_EXPIRY_HOURS", 24),
		AdminUsername:    getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword:    getEnv("ADMIN_PASSWORD", "admin123"),
		AdminDisplayName: getEnv("ADMIN_DISPLAY_NAME", "Admin"),

		// Company
		AppName:       getEnv("APP_NAME", "MY_SHOP_PPC"),
		CompanyName:   getEnv("COMPANY_NAME", "MY ELECTRONICS"),
		CompanyNameUr: getEnv("COMPANY_NAME_UR", "مائی الیکٹرانکس"),
		BranchName:    getEnv("BRANCH_NAME", "SADIQ"),
		BranchNameUr:  getEnv("BRANCH_NAME_UR", "صادق"),
		Address:       getEnv("ADDRESS", "Behari Colony, Disposal Chowk, Bismillah Service Station, Opposite Noor Super Store, Kacha Aiemanabad Road, Gujranwala"),
		AddressUr:     getEnv("ADDRESS_UR", "بہاری کالونی، ڈسپوزل چوک، بسم اللہ سروس اسٹیشن، نور سپر اسٹور کے سامنے، کچّہ ایمن آباد روڈ، گوجرانوالہ"),

		// Contact
		Phones: phones,

		// Software
		SoftwareBy:   getEnv("SOFTWARE_BY", "Huzaifa (0313-6487199)"),
		SoftwareByUr: getEnv("SOFTWARE_BY_UR", "حذیفہ (0313-6487199)"),

		// Receipt Notes
		InvoiceNote:   getEnv("INVOICE_NOTE", ""),
		InvoiceNoteUr: getEnv("INVOICE_NOTE_UR", "نوٹ: مذکورہ بالا تفصیلات درست اور تصدیق شدہ ہیں۔"),
		ServiceNote:   getEnv("SERVICE_NOTE", ""),
		ServiceNoteUr: getEnv("SERVICE_NOTE_UR", "سروس چارجز میں صرف ایڈوانس شامل ہے"),

		// Integrations
		SMSEndpoint:     getEnv("SMS_ENDPOINT", ""),
		WhatsAppAPI:     getEnv("WHATSAPP_API", ""),
		ThermalEndpoint: getEnv("THERMAL_ENDPOINT", ""),

		// Fine Settings
		FinePerDay:      getEnvAsFloat("FINE_PER_DAY", 100),
		FineMaxPercent:  getEnvAsFloat("FINE_MAX_PERCENT", 50),
		GracePeriodDays: getEnvAsInt("GRACE_PERIOD_DAYS", 3),
	}

	// ✅ Set global instance
	APP_CONFIG = cfg

	// ═══════════════════════════════════════
	// ⚠️ VALIDATION WARNINGS
	// ═══════════════════════════════════════
	validateConfig(cfg)

	log.Printf("✅ Config loaded | Server: %s | DB: %s | App: %s | Env: %s",
		cfg.ServerPort, cfg.DBName, cfg.AppName, cfg.Environment)

	return cfg
}

// ═══════════════════════════════════════
// ⚠️ VALIDATION
// ═══════════════════════════════════════

func validateConfig(cfg *Config) {
	warnings := []string{}

	if cfg.Environment == "production" {
		if cfg.MongoURI == "mongodb://localhost:27017" {
			warnings = append(warnings, "MONGO_URI is set to localhost")
		}
		if cfg.JWTSecret == "change-me-in-production" {
			warnings = append(warnings, "JWT_SECRET is set to default value")
		}
		if cfg.AdminPassword == "admin123" {
			warnings = append(warnings, "ADMIN_PASSWORD is set to default value")
		}
	}

	if len(warnings) > 0 {
		log.Println("⚠️  ═══════════════════════════════════════")
		log.Println("⚠️  SECURITY WARNINGS:")
		for _, w := range warnings {
			log.Printf("⚠️    • %s", w)
		}
		log.Println("⚠️  ═══════════════════════════════════════")
	}
}

// ═══════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════

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
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
		log.Printf("⚠️  Invalid integer for %s: %s, using default: %d", key, v, fallback)
	}
	return fallback
}

// getEnvAsFloat returns the value of the environment variable as float64, otherwise fallback.
func getEnvAsFloat(key string, fallback float64) float64 {
	if v := os.Getenv(key); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
		log.Printf("⚠️  Invalid float for %s: %s, using default: %.2f", key, v, fallback)
	}
	return fallback
}

// parsePhones parses a comma-separated phone string into a slice
func parsePhones(s string) []string {
	if s == "" {
		return []string{}
	}
	parts := strings.Split(s, ",")
	phones := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			phones = append(phones, p)
		}
	}
	if len(phones) == 0 {
		return []string{"0324-9959800", "0319-6429407", "0318-7311277"}
	}
	return phones
}

// ═══════════════════════════════════════
// 📋 PUBLIC HELPER METHODS
// ═══════════════════════════════════════

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
	return c.Phones
}

// GetCompanyInfo returns company information for receipts and API responses
func (c *Config) GetCompanyInfo() map[string]interface{} {
	return map[string]interface{}{
		"appName":       c.AppName,
		"companyName":   c.CompanyName,
		"companyNameUr": c.CompanyNameUr,
		"branchName":    c.BranchName,
		"branchNameUr":  c.BranchNameUr,
		"address":       c.Address,
		"addressUr":     c.AddressUr,
		"phones":        c.Phones,
		"softwareBy":    c.SoftwareBy,
		"softwareByUr":  c.SoftwareByUr,
	}
}

// GetReceiptConfig returns receipt-specific configuration
func (c *Config) GetReceiptConfig() map[string]interface{} {
	return map[string]interface{}{
		"companyName":   c.CompanyName,
		"companyNameUr": c.CompanyNameUr,
		"branchName":    c.BranchName,
		"branchNameUr":  c.BranchNameUr,
		"address":       c.Address,
		"addressUr":     c.AddressUr,
		"phones":        c.Phones,
		"softwareBy":    c.SoftwareBy,
		"softwareByUr":  c.SoftwareByUr,
		"invoiceNote":   c.InvoiceNote,
		"invoiceNoteUr": c.InvoiceNoteUr,
		"serviceNote":   c.ServiceNote,
		"serviceNoteUr": c.ServiceNoteUr,
	}
}

// GetPhonesString returns phones as a pipe-separated string
func (c *Config) GetPhonesString() string {
	return strings.Join(c.Phones, " | ")
}