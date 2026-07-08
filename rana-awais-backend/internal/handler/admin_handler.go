package handler

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/middleware"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
)

type AdminHandler struct {
	userSvc *service.UserService
}

func NewAdminHandler(userSvc *service.UserService) *AdminHandler {
	return &AdminHandler{userSvc: userSvc}
}

// ═══════════════════════════════════════
// 📦 BACKUP ENGINE
// ═══════════════════════════════════════

// generateBackup creates a full database backup as JSON bytes
func (h *AdminHandler) generateBackup() ([]byte, error) {
	db := config.DB

	result := make(map[string][]map[string]interface{})

	exportTable := func(tableName string) {
		allowed := map[string]bool{
			"users": true, "customers": true, "guarantors": true, "products": true,
			"inventory_items": true, "installment_plans": true, "installment_details": true,
			"payments": true, "accounting_entries": true, "notifications": true,
			"license": true, "audit_logs": true, "sync_logs": true, "promises": true,
		}
		if !allowed[tableName] {
			return
		}
		rows, err := db.Query("SELECT * FROM " + tableName)
		if err != nil {
			return
		}
		defer rows.Close()
		columns, _ := rows.Columns()
		var docs []map[string]interface{}
		for rows.Next() {
			vals := make([]interface{}, len(columns))
			valPtrs := make([]interface{}, len(columns))
			for i := range vals {
				valPtrs[i] = &vals[i]
			}
			rows.Scan(valPtrs...)
			row := make(map[string]interface{})
			for i, col := range columns {
				row[col] = vals[i]
			}
			docs = append(docs, row)
		}
		if docs == nil {
			docs = []map[string]interface{}{}
		}
		result[tableName] = docs
	}

	tables := []string{"users", "customers", "guarantors", "products", "inventory_items",
		"installment_plans", "installment_details", "payments", "accounting_entries",
		"notifications", "license", "audit_logs", "sync_logs", "promises"}
	for _, t := range tables {
		exportTable(t)
	}

	// Add metadata
	result["_metadata"] = []map[string]interface{}{
		{
			"backup_date":   time.Now().Format(time.RFC3339),
			"app_version":   "1.0.0",
			"database_name": "Rana Awais Electronics",
		},
	}

	return json.MarshalIndent(result, "", "  ")
}

// ═══════════════════════════════════════
// 🔐 BACKUP ENCRYPTION (AES-256-GCM)
// ═══════════════════════════════════════

// encryptBackup encrypts backup data using AES-256-GCM with the given password
func encryptBackup(data []byte, password string) ([]byte, error) {
	if password == "" {
		// No encryption - return as-is
		return data, nil
	}

	// Derive a 32-byte key from password using SHA-256
	key := sha256Hash(password)

	// Create AES cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %v", err)
	}

	// Use GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %v", err)
	}

	// Generate random nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %v", err)
	}

	// Encrypt and append nonce + ciphertext
	ciphertext := gcm.Seal(nonce, nonce, data, nil)

	// Format: base64(nonce + ciphertext) with "ENC:" prefix
	encoded := base64.StdEncoding.EncodeToString(ciphertext)
	result := []byte("ENC:" + encoded)

	return result, nil
}

// decryptBackup decrypts backup data that was encrypted with encryptBackup
func decryptBackup(data []byte, password string) ([]byte, error) {
	if password == "" {
		// No encryption - return as-is
		return data, nil
	}

	// Check for ENC: prefix
	str := string(data)
	if !strings.HasPrefix(str, "ENC:") {
		return nil, fmt.Errorf("not an encrypted backup (missing ENC: prefix)")
	}

	// Remove prefix and decode base64
	encoded := str[4:]
	ciphertext, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, fmt.Errorf("invalid base64 encoding: %v", err)
	}

	// Derive key
	key := sha256Hash(password)

	// Create AES cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %v", err)
	}

	// Use GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %v", err)
	}

	// Extract nonce
	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, fmt.Errorf("ciphertext too short")
	}
	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]

	// Decrypt
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("decryption failed (wrong password?): %v", err)
	}

	return plaintext, nil
}

// sha256Hash returns SHA-256 hash of the input string as a 32-byte key
func sha256Hash(input string) []byte {
	// Simple SHA-256 implementation using crypto/sha256
	// We import it below
	h := sha256.Sum256([]byte(input))
	return h[:]
}

// ═══════════════════════════════════════
// 💾 MANUAL BACKUP - Download as JSON file
// ═══════════════════════════════════════

// Backup returns a full database backup as a downloadable JSON file.
// Supports optional encryption via X-Backup-Password header
func (h *AdminHandler) Backup(w http.ResponseWriter, r *http.Request) {
	data, err := h.generateBackup()
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to generate backup", "بیک اپ بنانے میں ناکامی")
		return
	}

	// ✅ Optional encryption - check for password header
	password := r.Header.Get("X-Backup-Password")
	if password != "" {
		encrypted, err := encryptBackup(data, password)
		if err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to encrypt backup", "بیک اپ انکرپٹ کرنے میں ناکامی")
			return
		}
		data = encrypted
	}

	filename := fmt.Sprintf("rana-awais-backup-%s.json", time.Now().Format("2006-01-02_150405"))

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
	w.Write(data)
}

// ═══════════════════════════════════════
// 🔄 RESTORE - Upload JSON file to restore
// ═══════════════════════════════════════

// Restore restores the database from a JSON backup.
func (h *AdminHandler) Restore(w http.ResponseWriter, r *http.Request) {
	db := config.DB

	var backupData map[string][]map[string]interface{}

	// Try multipart form first (file upload from browser)
	contentType := r.Header.Get("Content-Type")
	if strings.Contains(contentType, "multipart/form-data") {
		if err := r.ParseMultipartForm(100 << 20); err != nil { // 100 MB max
			respondError(w, r, http.StatusBadRequest, "File too large or invalid", "فائل بہت بڑی ہے یا غلط ہے")
			return
		}

		file, _, err := r.FormFile("backup")
		if err != nil {
			respondError(w, r, http.StatusBadRequest, "No backup file found", "بیک اپ فائل نہیں ملی")
			return
		}
		defer file.Close()

		if err := json.NewDecoder(file).Decode(&backupData); err != nil {
			respondError(w, r, http.StatusBadRequest, "Invalid backup file format", "غلط بیک اپ فائل فارمیٹ")
			return
		}
	} else {
		// Try reading from body directly (JSON body)
		if err := json.NewDecoder(r.Body).Decode(&backupData); err != nil {
			respondError(w, r, http.StatusBadRequest, "Invalid backup file format", "غلط بیک اپ فائل فارمیٹ")
			return
		}
	}

	if err := h.restoreData(db, backupData); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "بحال کرنے میں ناکامی")
		return
	}

	// ✅ Clear all caches after restore to ensure fresh data
	middleware.DashboardCache.InvalidatePrefix("/api/dashboard")
	middleware.DashboardCache.InvalidatePrefix("/api/accounting")
	middleware.DashboardCache.InvalidatePrefix("/api/customers")
	middleware.DashboardCache.InvalidatePrefix("/api/products")
	middleware.DashboardCache.InvalidatePrefix("/api/installments")
	middleware.DashboardCache.InvalidatePrefix("/api/guarantors")
	middleware.DashboardCache.InvalidatePrefix("/api/inventory")
	middleware.DashboardCache.InvalidatePrefix("/api/payments")
	middleware.DashboardCache.InvalidatePrefix("/api/reports")
	middleware.DashboardCache.InvalidatePrefix("/api/promises")
	log.Println("🧹 All caches cleared after restore")

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":    "Backup restored successfully. Please refresh the page.",
		"message_ur": "بیک اپ کامیابی سے بحال ہو گیا۔ براہ کرم پیج ریفریش کریں۔",
	})
}

// restoreData performs the actual restore in a transaction
func (h *AdminHandler) restoreData(db *sql.DB, backupData map[string][]map[string]interface{}) error {
	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to start transaction")
	}
	defer tx.Rollback()

	// Clear existing data (in reverse dependency order)
	tables := []string{"promises", "sync_logs", "audit_logs", "license", "notifications",
		"accounting_entries", "payments", "installment_details", "installment_plans",
		"inventory_items", "products", "guarantors", "customers", "users"}

	for _, table := range tables {
		if _, err := tx.Exec("DELETE FROM " + table); err != nil {
			return fmt.Errorf("failed to clear table %s: %v", table, err)
		}
	}

	// Restore data (in dependency order)
	restoreTables := []string{"users", "customers", "guarantors", "products", "inventory_items",
		"installment_plans", "installment_details", "payments", "accounting_entries",
		"notifications", "license", "audit_logs", "sync_logs", "promises"}

	for _, table := range restoreTables {
		rows, ok := backupData[table]
		if !ok || len(rows) == 0 {
			continue
		}

		for _, row := range rows {
			columns := make([]string, 0, len(row))
			values := make([]interface{}, 0, len(row))
			placeholders := make([]string, 0, len(row))

			for col, val := range row {
				columns = append(columns, col)
				values = append(values, val)
				placeholders = append(placeholders, "?")
			}

			query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
				table,
				strings.Join(columns, ", "),
				strings.Join(placeholders, ", "))

			if _, err := tx.Exec(query, values...); err != nil {
				// Skip rows that fail (e.g., duplicate IDs)
				continue
			}
		}
	}

	return tx.Commit()
}

// ═══════════════════════════════════════
// 📧 EMAIL BACKUP
// ═══════════════════════════════════════

// SendEmailBackup sends a backup to the configured email address
func (h *AdminHandler) SendEmailBackup(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		SmtpHost string `json:"smtpHost"`
		SmtpPort string `json:"smtpPort"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request", "غلط درخواست")
		return
	}

	if req.Email == "" {
		respondError(w, r, http.StatusBadRequest, "Email is required", "ای میل ضروری ہے")
		return
	}

	// Generate backup
	data, err := h.generateBackup()
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to generate backup", "بیک اپ بنانے میں ناکامی")
		return
	}

	// Default SMTP settings
	if req.SmtpHost == "" {
		req.SmtpHost = "smtp.gmail.com"
	}
	if req.SmtpPort == "" {
		req.SmtpPort = "587"
	}

	// Send email with backup attachment
	go func() {
		if err := sendEmailWithAttachment(req.Email, req.Password, req.SmtpHost, req.SmtpPort, data); err != nil {
			log.Printf("⚠️ Email backup failed: %v", err)
		} else {
			log.Printf("✅ Email backup sent to %s", req.Email)
		}
	}()

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":    "Backup email is being sent",
		"message_ur": "بیک اپ ای میل بھیجا جا رہا ہے",
	})
}

// sendEmailWithAttachment sends an email with the backup file attached
func sendEmailWithAttachment(to, password, smtpHost, smtpPort string, data []byte) error {
	from := to

	// Set up authentication
	auth := smtp.PlainAuth("", from, password, smtpHost)

	// Create email with attachment
	boundary := "BOUNDARY1234567890"
	filename := fmt.Sprintf("rana-awais-backup-%s.json", time.Now().Format("2006-01-02_150405"))

	header := make(map[string]string)
	header["From"] = from
	header["To"] = to
	header["Subject"] = fmt.Sprintf("Rana Awais Electronics Backup - %s", time.Now().Format("2006-01-02"))
	header["MIME-Version"] = "1.0"
	header["Content-Type"] = fmt.Sprintf(`multipart/mixed; boundary="%s"`, boundary)

	var msg bytes.Buffer
	for k, v := range header {
		msg.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	msg.WriteString("\r\n")

	// Email body
	msg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	msg.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(fmt.Sprintf("Rana Awais Electronics Database Backup\r\n"))
	msg.WriteString(fmt.Sprintf("Date: %s\r\n", time.Now().Format("2006-01-02 15:04:05")))
	msg.WriteString("\r\n")
	msg.WriteString("Please find attached the database backup file.\r\n")
	msg.WriteString("\r\n")

	// Attachment
	msg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	msg.WriteString("Content-Type: application/json\r\n")
	msg.WriteString(fmt.Sprintf("Content-Disposition: attachment; filename=\"%s\"\r\n", filename))
	msg.WriteString("Content-Transfer-Encoding: base64\r\n")
	msg.WriteString("\r\n")

	// Encode data as base64 using standard library
	encoded := base64.StdEncoding.EncodeToString(data)
	// Split into 76-character lines
	for i := 0; i < len(encoded); i += 76 {
		end := i + 76
		if end > len(encoded) {
			end = len(encoded)
		}
		msg.WriteString(encoded[i:end])
		msg.WriteString("\r\n")
	}

	msg.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

	// Send email
	return smtp.SendMail(fmt.Sprintf("%s:%s", smtpHost, smtpPort), auth, from, []string{to}, msg.Bytes())
}

// ═══════════════════════════════════════
// ⏰ AUTO BACKUP SCHEDULER
// ═══════════════════════════════════════

// AutoBackupConfig holds auto-backup settings
type AutoBackupConfig struct {
	Enabled      bool   `json:"enabled"`
	Interval     string `json:"interval"`     // "daily", "weekly"
	Time         string `json:"time"`          // "02:00"
	BackupDir    string `json:"backupDir"`     // Directory to save backups
	MaxBackups   int    `json:"maxBackups"`    // Max number of backups to keep
	EmailBackup  bool   `json:"emailBackup"`   // Also send via email
	EmailAddress string `json:"emailAddress"`
	EmailPass    string `json:"emailPass"`
	SmtpHost     string `json:"smtpHost"`
	SmtpPort     string `json:"smtpPort"`
}

// StartAutoBackup starts the auto-backup scheduler
func StartAutoBackup(h *AdminHandler) {
	go func() {
		// Wait a bit for server to start
		time.Sleep(30 * time.Second)

		for {
			cfg := loadAutoBackupConfig()
			if cfg.Enabled {
				now := time.Now()
				nextRun := calculateNextRun(cfg, now)
				duration := nextRun.Sub(now)
				if duration < 0 {
					duration = 24 * time.Hour
				}

				log.Printf("⏰ Next auto-backup at: %s (in %v)", nextRun.Format("2006-01-02 15:04"), duration)
				time.Sleep(duration)

				// Run backup
				log.Println("⏰ Running auto-backup...")
				if err := h.runAutoBackup(cfg); err != nil {
					log.Printf("⚠️ Auto-backup failed: %v", err)
				} else {
					log.Println("✅ Auto-backup completed successfully")
				}
			} else {
				// Check every hour if config changed
				time.Sleep(1 * time.Hour)
			}
		}
	}()
}

func loadAutoBackupConfig() AutoBackupConfig {
	db := config.DB
	cfg := AutoBackupConfig{
		Enabled:    false,
		Interval:   "daily",
		Time:       "02:00",
		BackupDir:  filepath.Join(".", "backups"),
		MaxBackups: 30,
	}

	rows, err := db.Query("SELECT key, value FROM settings WHERE key LIKE 'backup_%'")
	if err != nil {
		return cfg
	}
	defer rows.Close()

	for rows.Next() {
		var key, value string
		rows.Scan(&key, &value)
		switch key {
		case "backup_enabled":
			cfg.Enabled = value == "true"
		case "backup_interval":
			cfg.Interval = value
		case "backup_time":
			cfg.Time = value
		case "backup_dir":
			cfg.BackupDir = value
		case "backup_max":
			fmt.Sscanf(value, "%d", &cfg.MaxBackups)
		case "backup_email_enabled":
			cfg.EmailBackup = value == "true"
		case "backup_email_address":
			cfg.EmailAddress = value
		case "backup_email_pass":
			cfg.EmailPass = value
		case "backup_smtp_host":
			cfg.SmtpHost = value
		case "backup_smtp_port":
			cfg.SmtpPort = value
		}
	}

	return cfg
}

func calculateNextRun(cfg AutoBackupConfig, now time.Time) time.Time {
	// Parse time
	parts := strings.Split(cfg.Time, ":")
	hour := 2
	minute := 0
	if len(parts) >= 2 {
		fmt.Sscanf(parts[0], "%d", &hour)
		fmt.Sscanf(parts[1], "%d", &minute)
	}

	next := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, now.Location())
	if next.Before(now) || next.Equal(now) {
		next = next.Add(24 * time.Hour)
	}

	return next
}

func (h *AdminHandler) runAutoBackup(cfg AutoBackupConfig) error {
	// Generate backup data
	data, err := h.generateBackup()
	if err != nil {
		return fmt.Errorf("failed to generate backup: %v", err)
	}

	// Ensure backup directory exists
	if err := os.MkdirAll(cfg.BackupDir, 0755); err != nil {
		return fmt.Errorf("failed to create backup directory: %v", err)
	}

	// Save backup file
	filename := fmt.Sprintf("rana-awais-backup-%s.json", time.Now().Format("2006-01-02_150405"))
	backupPath := filepath.Join(cfg.BackupDir, filename)
	if err := os.WriteFile(backupPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write backup file: %v", err)
	}
	log.Printf("💾 Auto-backup saved: %s", backupPath)

	// Clean old backups
	if cfg.MaxBackups > 0 {
		cleanOldBackups(cfg.BackupDir, cfg.MaxBackups)
	}

	// Send email backup if configured
	if cfg.EmailBackup && cfg.EmailAddress != "" && cfg.EmailPass != "" {
		smtpHost := cfg.SmtpHost
		smtpPort := cfg.SmtpPort
		if smtpHost == "" {
			smtpHost = "smtp.gmail.com"
		}
		if smtpPort == "" {
			smtpPort = "587"
		}

		go func() {
			if err := sendEmailWithAttachment(cfg.EmailAddress, cfg.EmailPass, smtpHost, smtpPort, data); err != nil {
				log.Printf("⚠️ Auto email backup failed: %v", err)
			} else {
				log.Printf("✅ Auto email backup sent to %s", cfg.EmailAddress)
			}
		}()
	}

	return nil
}

func cleanOldBackups(dir string, maxBackups int) {
	files, err := filepath.Glob(filepath.Join(dir, "rana-awais-backup-*.json"))
	if err != nil {
		return
	}

	if len(files) <= maxBackups {
		return
	}

	// Sort by modification time (oldest first)
	type fileInfo struct {
		path    string
		modTime time.Time
	}
	var infos []fileInfo
	for _, f := range files {
		info, err := os.Stat(f)
		if err != nil {
			continue
		}
		infos = append(infos, fileInfo{path: f, modTime: info.ModTime()})
	}

	// Sort by modTime ascending
	for i := 0; i < len(infos); i++ {
		for j := i + 1; j < len(infos); j++ {
			if infos[j].modTime.Before(infos[i].modTime) {
				infos[i], infos[j] = infos[j], infos[i]
			}
		}
	}

	// Delete oldest files
	toDelete := len(infos) - maxBackups
	for i := 0; i < toDelete; i++ {
		os.Remove(infos[i].path)
		log.Printf("🗑️ Removed old backup: %s", infos[i].path)
	}
}

// ═══════════════════════════════════════
// ⚙️ BACKUP SETTINGS
// ═══════════════════════════════════════

// GetBackupSettings returns current backup settings
func (h *AdminHandler) GetBackupSettings(w http.ResponseWriter, r *http.Request) {
	cfg := loadAutoBackupConfig()
	respondJSON(w, http.StatusOK, cfg)
}

// UpdateBackupSettings updates backup settings
func (h *AdminHandler) UpdateBackupSettings(w http.ResponseWriter, r *http.Request) {
	var req AutoBackupConfig
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request", "غلط درخواست")
		return
	}

	db := config.DB
	settings := map[string]string{
		"backup_enabled":       fmt.Sprintf("%v", req.Enabled),
		"backup_interval":      req.Interval,
		"backup_time":          req.Time,
		"backup_dir":           req.BackupDir,
		"backup_max":           fmt.Sprintf("%d", req.MaxBackups),
		"backup_email_enabled": fmt.Sprintf("%v", req.EmailBackup),
		"backup_email_address": req.EmailAddress,
		"backup_email_pass":    req.EmailPass,
		"backup_smtp_host":     req.SmtpHost,
		"backup_smtp_port":     req.SmtpPort,
	}

	for key, value := range settings {
		_, err := db.Exec("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
			key, value, value)
		if err != nil {
			log.Printf("⚠️ Failed to save setting %s: %v", key, err)
		}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":    "Backup settings updated successfully",
		"message_ur": "بیک اپ سیٹنگز کامیابی سے اپ ڈیٹ ہو گئیں",
	})
}

// ═══════════════════════════════════════
// ⚙️ SETTINGS
// ═══════════════════════════════════════

// GetSettings returns application settings
func (h *AdminHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	db := config.DB

	rows, err := db.QueryContext(r.Context(), "SELECT key, value FROM settings")
	if err != nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{"settings": map[string]string{}})
		return
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var key, value string
		rows.Scan(&key, &value)
		settings[key] = value
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{"settings": settings})
}

// UpdateSettings updates application settings
func (h *AdminHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	db := config.DB

	var req struct {
		Settings map[string]string `json:"settings"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request", "غلط درخواست")
		return
	}

	for key, value := range req.Settings {
		_, err := db.ExecContext(r.Context(),
			"INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
			key, value, value)
		if err != nil {
			respondError(w, r, http.StatusInternalServerError,
				fmt.Sprintf("Failed to update setting %s", key),
				fmt.Sprintf("سیٹنگ %s اپ ڈیٹ نہیں ہو سکی", key))
			return
		}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":    "Settings updated successfully",
		"message_ur": "سیٹنگز کامیابی سے اپ ڈیٹ ہو گئیں",
	})
}

// ═══════════════════════════════════════
// 🔑 LICENSE VALIDATION (App UI se)
// ═══════════════════════════════════════

// ValidateLicenseAPI validates a license key from the frontend UI
func (h *AdminHandler) ValidateLicenseAPI(w http.ResponseWriter, r *http.Request) {
	var req struct {
		LicenseKey string `json:"licenseKey"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request", "غلط درخواست")
		return
	}

	if req.LicenseKey == "" {
		respondError(w, r, http.StatusBadRequest, "License key is required", "لائسنس کلید ضروری ہے")
		return
	}

	// Master key check
	masterKey := "Huziafaish1133@#$%"
	if req.LicenseKey == masterKey {
		// Save license to database - BOTH settings table AND license table
		db := config.DB
		
		// Save to settings table (for GetLicenseStatus)
		_, err := db.Exec("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
			"license_key", req.LicenseKey, req.LicenseKey)
		if err != nil {
			log.Printf("⚠️ Failed to save license: %v", err)
		}
		_, err = db.Exec("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
			"license_activated", "true", "true")
		if err != nil {
			log.Printf("⚠️ Failed to save license status: %v", err)
		}
		
		// Also save to license table (for ValidateLicense middleware)
		var count int
		db.QueryRow("SELECT COUNT(*) FROM license WHERE license_key = ?", masterKey).Scan(&count)
		if count == 0 {
			_, err = db.Exec(`
				INSERT INTO license (license_key, client_name, expiry_date, is_active, created_at)
				VALUES (?, ?, ?, ?, ?)`,
				masterKey, "Permanent License", "2099-12-31", 1, time.Now())
			if err != nil {
				log.Printf("⚠️ Failed to register permanent license in license table: %v", err)
			} else {
				log.Println("✅ PERMANENT LICENSE registered in license table!")
			}
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"valid":      true,
			"message":    "License activated successfully!",
			"message_ur": "لائسنس کامیابی سے فعال ہو گیا!",
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"valid":      false,
		"message":    "Invalid license key",
		"message_ur": "غلط لائسنس کلید",
	})
}

// GetLicenseStatus returns whether a license has been activated
// ✅ Checks database for active license
func (h *AdminHandler) GetLicenseStatus(w http.ResponseWriter, r *http.Request) {
	db := config.DB

	// Check settings table first
	var activated string
	err := db.QueryRow("SELECT value FROM settings WHERE key = 'license_activated'").Scan(&activated)
	if err == nil && activated == "true" {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"activated": true,
			"valid":     true,
			"message":   "License is active",
		})
		return
	}

	// Check license table for permanent license
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM license WHERE license_key = ? AND is_active = 1", middleware.MASTER_LICENSE_KEY).Scan(&count)
	if err == nil && count > 0 {
		// Save to settings for faster lookup next time
		db.Exec("INSERT INTO settings (key, value) VALUES ('license_activated', 'true') ON CONFLICT(key) DO UPDATE SET value = 'true'")
		db.Exec("INSERT INTO settings (key, value) VALUES ('license_key', ?) ON CONFLICT(key) DO UPDATE SET value = ?", middleware.MASTER_LICENSE_KEY, middleware.MASTER_LICENSE_KEY)

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"activated": true,
			"valid":     true,
			"message":   "License is active",
		})
		return
	}

	// No license found
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"activated": false,
		"valid":     false,
		"message":   "No active license found. Please activate the software.",
	})
}
