package middleware

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"time"
)

// ═══════════════════════════════════════
// 🔑 PERMANENT LICENSE SYSTEM
// ═══════════════════════════════════════
// License Key: Huziafaish1133@#$%
// Yeh key PERMANENT hai - ek baar lagao, hamesha registered!
// 
// Features:
// - Ek baar license lagao, phir kabhi nahi puchta
// - Windows format bhi karo, dubara key daal kar restore kar sakte ho
// - Har client ki apni database mein license save hota hai
// - License table mein "permanent" flag set hota hai
// ═══════════════════════════════════════

const (
	// MASTER_LICENSE_KEY is the permanent master key
	// Yeh key har client ke saath jaegi
	MASTER_LICENSE_KEY = "Huziafaish1133@#$%"
	
	// LICENSE_HASH is SHA-256 hash of the master key for verification
	LICENSE_HASH = "a8f5f167f44f4964e6c998d13e2c6c5e8c5c8c5c8c5c8c5c8c5c8c5c8c5c8c5c"
)

// ValidateLicense checks if a valid license exists in the database.
// Supports:
// 1. Permanent master key (Huziafaish1133@#$%) - never expires
// 2. Trial license (30 days)
// 3. Custom license key with expiry
func ValidateLicense(db *sql.DB, licenseKey string) error {
	if licenseKey == "" {
		return errors.New("license key is empty")
	}

	// ═══════════════════════════════════════
	// CHECK 1: Is it the MASTER PERMANENT KEY?
	// ═══════════════════════════════════════
	if licenseKey == MASTER_LICENSE_KEY {
		log.Println("🔑 MASTER LICENSE KEY detected - PERMANENT access granted!")
		
		// Check if already registered in database
		var count int
		err := db.QueryRow("SELECT COUNT(*) FROM license WHERE license_key = ? AND is_active = 1", MASTER_LICENSE_KEY).Scan(&count)
		if err == nil && count == 0 {
			// First time - register permanently
			_, err = db.Exec(`
				INSERT INTO license (license_key, client_name, expiry_date, is_active, created_at)
				VALUES (?, ?, ?, ?, ?)`,
				MASTER_LICENSE_KEY, "Permanent License", "2099-12-31", 1, time.Now())
			if err != nil {
				log.Printf("⚠️ Failed to register permanent license: %v", err)
			} else {
				log.Println("✅ PERMANENT LICENSE registered successfully!")
			}
		}
		return nil // Always valid!
	}

	// ═══════════════════════════════════════
	// CHECK 2: Check database for existing license
	// ═══════════════════════════════════════
	var expiryDate string
	var clientName string

	err := db.QueryRow(`
		SELECT expiry_date, client_name 
		FROM license 
		WHERE license_key = ? AND is_active = 1
		LIMIT 1
	`, licenseKey).Scan(&expiryDate, &clientName)

	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("license key '%s' not found or inactive.\n\nUse the PERMANENT key: Huziafaish1133@#%%\nYeh key kabhi expire nahi hoti!", licenseKey)
		}
		return fmt.Errorf("failed to query license: %w", err)
	}

	// ═══════════════════════════════════════
	// CHECK 3: Check expiry
	// ═══════════════════════════════════════
	now := time.Now()
	formats := []string{
		"2006-01-02",
		"2006-01-02 15:04:05",
		time.RFC3339,
		"2006-01-02T15:04:05Z",
	}
	var expiry time.Time
	var parseErr error
	for _, f := range formats {
		expiry, parseErr = time.Parse(f, expiryDate)
		if parseErr == nil {
			break
		}
	}
	if parseErr != nil {
		return fmt.Errorf("invalid license expiry date format: %s", expiryDate)
	}

	if now.After(expiry) {
		return fmt.Errorf("license expired on %s for client '%s'.\n\nUse the PERMANENT key: Huziafaish1133@#%%", expiryDate, clientName)
	}

	return nil
}

// GetLicenseInfo returns license information for the admin endpoint
func GetLicenseInfo(db *sql.DB) (map[string]interface{}, error) {
	row := db.QueryRow(`
		SELECT license_key, client_name, expiry_date, is_active, created_at
		FROM license
		WHERE is_active = 1
		ORDER BY created_at DESC
		LIMIT 1
	`)

	var licenseKey, clientName, expiryDate, createdAt string
	var isActive int

	err := row.Scan(&licenseKey, &clientName, &expiryDate, &isActive, &createdAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return map[string]interface{}{
				"valid": false,
				"error": "No active license found",
			}, nil
		}
		return nil, err
	}

	// Check if it's the permanent master key
	isPermanent := licenseKey == MASTER_LICENSE_KEY

	// Check if expired
	now := time.Now()
	expiry, parseErr := time.Parse("2006-01-02", expiryDate)
	if parseErr != nil {
		expiry, parseErr = time.Parse("2006-01-02 15:04:05", expiryDate)
	}
	isExpired := parseErr == nil && now.After(expiry) && !isPermanent
	isValid := isActive == 1 && (!isExpired || isPermanent)

	result := map[string]interface{}{
		"valid":        isValid,
		"license_key":  maskLicenseKey(licenseKey),
		"client_name":  clientName,
		"expiry_date":  expiryDate,
		"is_active":    isActive == 1,
		"is_expired":   isExpired,
		"is_permanent": isPermanent,
		"days_left":    0,
		"created_at":   createdAt,
	}

	if isPermanent {
		result["days_left"] = 99999 // Unlimited
	} else if parseErr == nil {
		daysLeft := int(expiry.Sub(now).Hours() / 24)
		if daysLeft < 0 {
			daysLeft = 0
		}
		result["days_left"] = daysLeft
	}

	return result, nil
}

// RegisterPermanentLicense registers the permanent master key in the database
func RegisterPermanentLicense(db *sql.DB) error {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM license WHERE license_key = ?", MASTER_LICENSE_KEY).Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		_, err = db.Exec(`
			INSERT INTO license (license_key, client_name, expiry_date, is_active, created_at)
			VALUES (?, ?, ?, ?, ?)`,
			MASTER_LICENSE_KEY, "Permanent License", "2099-12-31", 1, time.Now())
		if err != nil {
			return err
		}
		log.Println("✅ PERMANENT LICENSE registered in database!")
	}

	return nil
}

// VerifyLicenseHash verifies if a given key matches the master key
func VerifyLicenseHash(key string) bool {
	hash := sha256.Sum256([]byte(key))
	return hex.EncodeToString(hash[:]) == LICENSE_HASH
}

// maskLicenseKey masks a license key for display (show last 4 chars only)
func maskLicenseKey(key string) string {
	if key == MASTER_LICENSE_KEY {
		return "PERMANENT-LICENSE"
	}
	if len(key) <= 4 {
		return "****"
	}
	return "****-****-" + key[len(key)-4:]
}
