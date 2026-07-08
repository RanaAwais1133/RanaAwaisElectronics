package config

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
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
	RateLimitRequests int    `env:"RATE_LIMIT_REQUESTS" envDefault:"1000"`
	MaxBodySizeMB     int    `env:"MAX_BODY_SIZE_MB" envDefault:"10"`
	EnableHTTPS       bool   `env:"ENABLE_HTTPS" envDefault:"false"`
	TLSCertFile       string `env:"TLS_CERT_FILE" envDefault:"./cert.pem"`
	TLSKeyFile        string `env:"TLS_KEY_FILE" envDefault:"./key.pem"`

	// ═══════════════════════════════════════
	// 🗄️ DATABASE (SQLite)
	// ═══════════════════════════════════════
	SQLitePath string `env:"SQLITE_PATH" envDefault:"./rana-awais.db"`

	// ═══════════════════════════════════════
	// 🗄️ DATABASE (MongoDB Atlas)
	// ═══════════════════════════════════════
	MongoURI     string `env:"MONGO_URI" envDefault:"mongodb://localhost:27017"`
	MongoDBName  string `env:"MONGO_DB_NAME" envDefault:"myelectronics"`
	UseMongoDB   bool   `env:"USE_MONGO_DB" envDefault:"false"`

	// ═══════════════════════════════════════
	// 🔐 AUTH
	// ═══════════════════════════════════════

	JWTSecret        string `env:"JWT_SECRET" envDefault:"change-me-in-production"`
	JWTExpiryHours   int    `env:"JWT_EXPIRY_HOURS" envDefault:"24"`
	AdminUsername    string `env:"ADMIN_USERNAME" envDefault:"admin"`
	AdminPassword    string `env:"ADMIN_PASSWORD" envDefault:"admin123"`
	AdminDisplayName string `env:"ADMIN_DISPLAY_NAME" envDefault:"Admin"`

	// ═══════════════════════════════════════
	// 🔑 LICENSE
	// ═══════════════════════════════════════
	LicenseKey string `env:"LICENSE_KEY" envDefault:"Huzaifaish1133@#$%"`

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
	FinePerDay      float64 `env:"FINE_PER_DAY" envDefault:"0"`
	FineMaxPercent  float64 `env:"FINE_MAX_PERCENT" envDefault:"0"`
	GracePeriodDays int     `env:"GRACE_PERIOD_DAYS" envDefault:"0"`
}

// ═══════════════════════════════════════
// 📋 LOAD CONFIGURATION
// ═══════════════════════════════════════

// ClientConfigFile represents the client-config.json structure
type ClientConfigFile struct {
	Client struct {
		Name          string   `json:"name"`
		NameUr        string   `json:"nameUr"`
		Branch        string   `json:"branch"`
		BranchUr      string   `json:"branchUr"`
		Address       string   `json:"address"`
		AddressUr     string   `json:"addressUr"`
		Phones        []string `json:"phones"`
		SoftwareBy    string   `json:"softwareBy"`
		SoftwareByUr  string   `json:"softwareByUr"`
		InvoiceNote   string   `json:"invoiceNote"`
		InvoiceNoteUr string   `json:"invoiceNoteUr"`
		ServiceNote   string   `json:"serviceNote"`
		ServiceNoteUr string   `json:"serviceNoteUr"`
	} `json:"client"`
	Server struct {
		Port        int    `json:"port"`
		Environment string `json:"environment"`
		FrontendURL string `json:"frontendUrl"`
	} `json:"server"`
	Database struct {
		Path string `json:"path"`
	} `json:"database"`
	Auth struct {
		JWTSecret        string `json:"jwtSecret"`
		JWTExpiryHours   int    `json:"jwtExpiryHours"`
		AdminUsername    string `json:"adminUsername"`
		AdminPassword    string `json:"adminPassword"`
		AdminDisplayName string `json:"adminDisplayName"`
	} `json:"auth"`
	License struct {
		Key string `json:"key"`
	} `json:"license"`
	Fine struct {
		PerDay          float64 `json:"perDay"`
		MaxPercent      float64 `json:"maxPercent"`
		GracePeriodDays int     `json:"gracePeriodDays"`
	} `json:"fine"`
	Integrations struct {
		SMSEndpoint     string `json:"smsEndpoint"`
		WhatsAppAPI     string `json:"whatsappApi"`
		ThermalEndpoint string `json:"thermalEndpoint"`
	} `json:"integrations"`
}

// loadClientConfig tries to load client-config.json and merge with env config
func loadClientConfig() *ClientConfigFile {
	configPaths := []string{
		"client-config.json",
		filepath.Join(filepath.Dir(os.Args[0]), "client-config.json"),
		filepath.Join(filepath.Dir(os.Args[0]), "..", "client-config.json"),
	}

	for _, path := range configPaths {
		data, err := os.ReadFile(path)
		if err == nil {
			var cc ClientConfigFile
			if err := json.Unmarshal(data, &cc); err == nil {
				log.Printf("✅ Loaded client config from: %s", path)
				return &cc
			}
		}
	}
	// Return empty config instead of nil to prevent nil pointer dereference
	return &ClientConfigFile{}
}

// Load reads configuration from environment variables (or a .env file).
func Load() *Config {
	// Try loading .env file from multiple locations
	envPaths := []string{
		".env",
		filepath.Join("rana-awais-backend", ".env"),
		filepath.Join(filepath.Dir(os.Args[0]), ".env"),
		filepath.Join(filepath.Dir(os.Args[0]), "..", "..", ".env"),
	}
	loaded := false
	for _, path := range envPaths {
		if err := godotenv.Load(path); err == nil {
			log.Printf("✅ Loaded .env from: %s", path)
			loaded = true
			break
		}
	}
	if !loaded {
		log.Println("ℹ️  No .env file found, using system environment variables...")
	}

	// Try loading client-config.json (overrides .env values)
	cc := loadClientConfig()

	// Parse phones from comma-separated string
	phonesStr := getEnv("PHONES", "0324-9959800,0319-6429407,0318-7311277")
	phones := parsePhones(phonesStr)

	// If client config has phones, use those instead
	if cc != nil && len(cc.Client.Phones) > 0 {
		phones = cc.Client.Phones
	}

	cfg := &Config{
		// Server
		ServerPort:        getEnv("SERVER_PORT", ifIntStr(cc, cc.Server.Port, "8080")),
		Environment:       getEnv("ENVIRONMENT", ifStr(cc, cc.Server.Environment, "development")),
		FrontendURL:       getEnv("FRONTEND_URL", ifStr(cc, cc.Server.FrontendURL, "http://localhost:3000")),
		RateLimitRequests: getEnvAsInt("RATE_LIMIT_REQUESTS", 1000),
		MaxBodySizeMB:     getEnvAsInt("MAX_BODY_SIZE_MB", 10),

		// Database
		SQLitePath: getEnv("SQLITE_PATH", ifStr(cc, cc.Database.Path, "./rana-awais.db")),

		// MongoDB
		MongoURI:    getEnv("MONGO_URI", "mongodb://localhost:27017"),
		MongoDBName: getEnv("MONGO_DB_NAME", "myelectronics"),
		UseMongoDB:  getEnvAsBool("USE_MONGO_DB", false),

		// Auth

		JWTSecret:        getEnv("JWT_SECRET", ifStr(cc, cc.Auth.JWTSecret, "change-me-in-production")),
		JWTExpiryHours:   getEnvAsInt("JWT_EXPIRY_HOURS", ifInt(cc, cc.Auth.JWTExpiryHours, 24)),
		AdminUsername:    getEnv("ADMIN_USERNAME", ifStr(cc, cc.Auth.AdminUsername, "admin")),
		AdminPassword:    getEnv("ADMIN_PASSWORD", ifStr(cc, cc.Auth.AdminPassword, "admin123")),
		AdminDisplayName: getEnv("ADMIN_DISPLAY_NAME", ifStr(cc, cc.Auth.AdminDisplayName, "Admin")),

		// License
		LicenseKey: getEnv("LICENSE_KEY", ifStr(cc, cc.License.Key, "Huzaifaish1133@#$%")),

		// Company
		AppName:       getEnv("APP_NAME", ifStr(cc, cc.Client.Name, "MY_SHOP_PPC")),
		CompanyName:   getEnv("COMPANY_NAME", ifStr(cc, cc.Client.Name, "MY ELECTRONICS")),
		CompanyNameUr: getEnv("COMPANY_NAME_UR", ifStr(cc, cc.Client.NameUr, "مائی الیکٹرانکس")),
		BranchName:    getEnv("BRANCH_NAME", ifStr(cc, cc.Client.Branch, "SADIQ")),
		BranchNameUr:  getEnv("BRANCH_NAME_UR", ifStr(cc, cc.Client.BranchUr, "صادق")),
		Address:       getEnv("ADDRESS", ifStr(cc, cc.Client.Address, "Behari Colony, Disposal Chowk, Bismillah Service Station, Opposite Noor Super Store, Kacha Aiemanabad Road, Gujranwala")),
		AddressUr:     getEnv("ADDRESS_UR", ifStr(cc, cc.Client.AddressUr, "بہاری کالونی، ڈسپوزل چوک، بسم اللہ سروس اسٹیشن، نور سپر اسٹور کے سامنے، کچّہ ایمن آباد روڈ، گوجرانوالہ")),

		// Contact
		Phones: phones,

		// Software
		SoftwareBy:   getEnv("SOFTWARE_BY", ifStr(cc, cc.Client.SoftwareBy, "Huzaifa (0313-6487199)")),
		SoftwareByUr: getEnv("SOFTWARE_BY_UR", ifStr(cc, cc.Client.SoftwareByUr, "حذیفہ (0313-6487199)")),

		// Receipt Notes
		InvoiceNote:   getEnv("INVOICE_NOTE", ifStr(cc, cc.Client.InvoiceNote, "")),
		InvoiceNoteUr: getEnv("INVOICE_NOTE_UR", ifStr(cc, cc.Client.InvoiceNoteUr, "نوٹ: مذکورہ بالا تفصیلات درست اور تصدیق شدہ ہیں۔")),
		ServiceNote:   getEnv("SERVICE_NOTE", ifStr(cc, cc.Client.ServiceNote, "")),
		ServiceNoteUr: getEnv("SERVICE_NOTE_UR", ifStr(cc, cc.Client.ServiceNoteUr, "سروس چارجز میں صرف ایڈوانس شامل ہے")),

		// Integrations
		SMSEndpoint:     getEnv("SMS_ENDPOINT", ifStr(cc, cc.Integrations.SMSEndpoint, "")),
		WhatsAppAPI:     getEnv("WHATSAPP_API", ifStr(cc, cc.Integrations.WhatsAppAPI, "")),
		ThermalEndpoint: getEnv("THERMAL_ENDPOINT", ifStr(cc, cc.Integrations.ThermalEndpoint, "")),

		// Fine Settings
		FinePerDay:      getEnvAsFloat("FINE_PER_DAY", ifFloat(cc, cc.Fine.PerDay, 0)),
		FineMaxPercent:  getEnvAsFloat("FINE_MAX_PERCENT", ifFloat(cc, cc.Fine.MaxPercent, 0)),
		GracePeriodDays: getEnvAsInt("GRACE_PERIOD_DAYS", ifInt(cc, cc.Fine.GracePeriodDays, 0)),
	}

	// ✅ Set global instance
	APP_CONFIG = cfg

	// ═══════════════════════════════════════
	// ⚠️ VALIDATION WARNINGS
	// ═══════════════════════════════════════
	validateConfig(cfg)

	log.Printf("✅ Config loaded | Server: %s | DB: %s | App: %s | Env: %s",
		cfg.ServerPort, cfg.SQLitePath, cfg.AppName, cfg.Environment)

	return cfg
}

// ═══════════════════════════════════════
// ⚠️ VALIDATION
// ═══════════════════════════════════════

func validateConfig(cfg *Config) {
	warnings := []string{}

	if cfg.Environment == "production" {
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

// getEnvAsBool returns the value of the environment variable as bool, otherwise fallback.
func getEnvAsBool(key string, fallback bool) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
		log.Printf("⚠️  Invalid bool for %s: %s, using default: %t", key, v, fallback)
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
// 🔧 CLIENT CONFIG HELPERS
// ═══════════════════════════════════════

// ifStr returns value from client config if available, otherwise fallback
func ifStr(cc *ClientConfigFile, val, fallback string) string {
	if cc != nil && val != "" {
		return val
	}
	return fallback
}

// ifInt returns value from client config if available, otherwise fallback
func ifInt(cc *ClientConfigFile, val, fallback int) int {
	if cc != nil && val != 0 {
		return val
	}
	return fallback
}

// ifFloat returns value from client config if available, otherwise fallback
func ifFloat(cc *ClientConfigFile, val, fallback float64) float64 {
	if cc != nil && val != 0 {
		return val
	}
	return fallback
}

// ifIntStr returns string representation of int from client config if available, otherwise fallback
func ifIntStr(cc *ClientConfigFile, val int, fallback string) string {
	if cc != nil && val != 0 {
		return strconv.Itoa(val)
	}
	return fallback
}

// ═══════════════════════════════════════
// 📋 PUBLIC HELPER METHODS
// ═══════════════════════════════════════

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
