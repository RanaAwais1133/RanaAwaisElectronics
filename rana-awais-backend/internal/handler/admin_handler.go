package handler

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
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
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/middleware"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type AdminHandler struct {
	userSvc      *service.UserService
	settingsRepo repository.SettingsRepository
}

func NewAdminHandler(userSvc *service.UserService, settingsRepo repository.SettingsRepository) *AdminHandler {
	return &AdminHandler{userSvc: userSvc, settingsRepo: settingsRepo}
}

// ═══════════════════════════════════════
// 📦 BACKUP ENGINE (MongoDB)
// ═══════════════════════════════════════

// generateBackup creates a full database backup as JSON bytes from MongoDB
func (h *AdminHandler) generateBackup() ([]byte, error) {
	db := config.MongoDatabase
	if db == nil {
		return nil, fmt.Errorf("MongoDB not connected")
	}

	result := make(map[string][]map[string]interface{})

	collections := []string{"users", "customers", "guarantors", "products", "inventory_items",
		"installment_plans", "installment_details", "payments", "accounting_entries",
		"notifications", "license", "audit_logs", "sync_logs", "promises", "expenses", "settings"}

	for _, collName := range collections {
		coll := db.Collection(collName)
		cursor, err := coll.Find(nil, bson.M{})
		if err != nil {
			continue
		}

		var docs []map[string]interface{}
		if err := cursor.All(nil, &docs); err != nil {
			cursor.Close(nil)
			continue
		}
		cursor.Close(nil)

		if docs == nil {
			docs = []map[string]interface{}{}
		}
		result[collName] = docs
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

func encryptBackup(data []byte, password string) ([]byte, error) {
	if password == "" {
		return data, nil
	}
	key := sha256Hash(password)
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %v", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %v", err)
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %v", err)
	}
	ciphertext := gcm.Seal(nonce, nonce, data, nil)
	encoded := base64.StdEncoding.EncodeToString(ciphertext)
	return []byte("ENC:" + encoded), nil
}

func decryptBackup(data []byte, password string) ([]byte, error) {
	if password == "" {
		return data, nil
	}
	str := string(data)
	if !strings.HasPrefix(str, "ENC:") {
		return nil, fmt.Errorf("not an encrypted backup (missing ENC: prefix)")
	}
	encoded := str[4:]
	ciphertext, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, fmt.Errorf("invalid base64 encoding: %v", err)
	}
	key := sha256Hash(password)
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %v", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %v", err)
	}
	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, fmt.Errorf("ciphertext too short")
	}
	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("decryption failed (wrong password?): %v", err)
	}
	return plaintext, nil
}

func sha256Hash(input string) []byte {
	h := sha256.Sum256([]byte(input))
	return h[:]
}

// ═══════════════════════════════════════
// 💾 MANUAL BACKUP
// ═══════════════════════════════════════

func (h *AdminHandler) Backup(w http.ResponseWriter, r *http.Request) {
	data, err := h.generateBackup()
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to generate backup", "بیک اپ بنانے میں ناکامی")
		return
	}

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
// 🔄 RESTORE
// ═══════════════════════════════════════

func (h *AdminHandler) Restore(w http.ResponseWriter, r *http.Request) {
	db := config.MongoDatabase
	if db == nil {
		respondError(w, r, http.StatusInternalServerError, "Database not connected", "ڈیٹا بیس منسلک نہیں")
		return
	}

	var backupData map[string][]map[string]interface{}

	contentType := r.Header.Get("Content-Type")
	if strings.Contains(contentType, "multipart/form-data") {
		if err := r.ParseMultipartForm(100 << 20); err != nil {
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
		if err := json.NewDecoder(r.Body).Decode(&backupData); err != nil {
			respondError(w, r, http.StatusBadRequest, "Invalid backup file format", "غلط بیک اپ فائل فارمیٹ")
			return
		}
	}

	if err := h.restoreData(db, backupData); err != nil {
		respondError(w, r, http.StatusInternalServerError, err.Error(), "بحال کرنے میں ناکامی")
		return
	}

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

func (h *AdminHandler) restoreData(db *mongo.Database, backupData map[string][]map[string]interface{}) error {
	collections := []string{"promises", "sync_logs", "audit_logs", "license", "notifications",
		"accounting_entries", "payments", "installment_details", "installment_plans",
		"inventory_items", "products", "guarantors", "customers", "users", "expenses", "settings"}

	// Clear existing data
	for _, collName := range collections {
		if _, err := db.Collection(collName).DeleteMany(nil, bson.M{}); err != nil {
			return fmt.Errorf("failed to clear collection %s: %v", collName, err)
		}
	}

	// Restore data
	restoreCollections := []string{"users", "customers", "guarantors", "products", "inventory_items",
		"installment_plans", "installment_details", "payments", "accounting_entries",
		"notifications", "license", "audit_logs", "sync_logs", "promises", "expenses", "settings"}

	for _, collName := range restoreCollections {
		docs, ok := backupData[collName]
		if !ok || len(docs) == 0 {
			continue
		}

		var interfaceDocs []interface{}
		for _, doc := range docs {
			interfaceDocs = append(interfaceDocs, doc)
		}

		if _, err := db.Collection(collName).InsertMany(nil, interfaceDocs); err != nil {
			log.Printf("⚠️ Failed to restore collection %s: %v (skipping)", collName, err)
			continue
		}
	}

	return nil
}

// ═══════════════════════════════════════
// 📧 EMAIL BACKUP
// ═══════════════════════════════════════

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

	data, err := h.generateBackup()
	if err != nil {
		respondError(w, r, http.StatusInternalServerError, "Failed to generate backup", "بیک اپ بنانے میں ناکامی")
		return
	}

	if req.SmtpHost == "" {
		req.SmtpHost = "smtp.gmail.com"
	}
	if req.SmtpPort == "" {
		req.SmtpPort = "587"
	}

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

func sendEmailWithAttachment(to, password, smtpHost, smtpPort string, data []byte) error {
	from := to
	auth := smtp.PlainAuth("", from, password, smtpHost)
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

	msg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	msg.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n\r\n")
	msg.WriteString(fmt.Sprintf("Rana Awais Electronics Database Backup\r\nDate: %s\r\n\r\n", time.Now().Format("2006-01-02 15:04:05")))
	msg.WriteString("Please find attached the database backup file.\r\n\r\n")

	msg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	msg.WriteString("Content-Type: application/json\r\n")
	msg.WriteString(fmt.Sprintf("Content-Disposition: attachment; filename=\"%s\"\r\n", filename))
	msg.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")

	encoded := base64.StdEncoding.EncodeToString(data)
	for i := 0; i < len(encoded); i += 76 {
		end := i + 76
		if end > len(encoded) {
			end = len(encoded)
		}
		msg.WriteString(encoded[i:end])
		msg.WriteString("\r\n")
	}
	msg.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

	return smtp.SendMail(fmt.Sprintf("%s:%s", smtpHost, smtpPort), auth, from, []string{to}, msg.Bytes())
}

// ═══════════════════════════════════════
// ⏰ AUTO BACKUP SCHEDULER
// ═══════════════════════════════════════

type AutoBackupConfig struct {
	Enabled      bool   `json:"enabled"`
	Interval     string `json:"interval"`
	Time         string `json:"time"`
	BackupDir    string `json:"backupDir"`
	MaxBackups   int    `json:"maxBackups"`
	EmailBackup  bool   `json:"emailBackup"`
	EmailAddress string `json:"emailAddress"`
	EmailPass    string `json:"emailPass"`
	SmtpHost     string `json:"smtpHost"`
	SmtpPort     string `json:"smtpPort"`
}

func StartAutoBackup(h *AdminHandler) {
	go func() {
		time.Sleep(30 * time.Second)
		for {
			cfg := loadAutoBackupConfig(h)
			if cfg.Enabled {
				now := time.Now()
				nextRun := calculateNextRun(cfg, now)
				duration := nextRun.Sub(now)
				if duration < 0 {
					duration = 24 * time.Hour
				}
				log.Printf("⏰ Next auto-backup at: %s (in %v)", nextRun.Format("2006-01-02 15:04"), duration)
				time.Sleep(duration)

				log.Println("⏰ Running auto-backup...")
				if err := h.runAutoBackup(cfg); err != nil {
					log.Printf("⚠️ Auto-backup failed: %v", err)
				} else {
					log.Println("✅ Auto-backup completed successfully")
				}
			} else {
				time.Sleep(1 * time.Hour)
			}
		}
	}()
}

func loadAutoBackupConfig(h *AdminHandler) AutoBackupConfig {
	cfg := AutoBackupConfig{
		Enabled:    false,
		Interval:   "daily",
		Time:       "02:00",
		BackupDir:  filepath.Join(".", "backups"),
		MaxBackups: 30,
	}

	settings, err := h.settingsRepo.GetAllSettings(nil)
	if err != nil {
		return cfg
	}

	if v, ok := settings["backup_enabled"]; ok {
		cfg.Enabled = v == "true"
	}
	if v, ok := settings["backup_interval"]; ok {
		cfg.Interval = v
	}
	if v, ok := settings["backup_time"]; ok {
		cfg.Time = v
	}
	if v, ok := settings["backup_dir"]; ok {
		cfg.BackupDir = v
	}
	if v, ok := settings["backup_max"]; ok {
		fmt.Sscanf(v, "%d", &cfg.MaxBackups)
	}
	if v, ok := settings["backup_email_enabled"]; ok {
		cfg.EmailBackup = v == "true"
	}
	if v, ok := settings["backup_email_address"]; ok {
		cfg.EmailAddress = v
	}
	if v, ok := settings["backup_email_pass"]; ok {
		cfg.EmailPass = v
	}
	if v, ok := settings["backup_smtp_host"]; ok {
		cfg.SmtpHost = v
	}
	if v, ok := settings["backup_smtp_port"]; ok {
		cfg.SmtpPort = v
	}

	return cfg
}

func calculateNextRun(cfg AutoBackupConfig, now time.Time) time.Time {
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
	data, err := h.generateBackup()
	if err != nil {
		return fmt.Errorf("failed to generate backup: %v", err)
	}

	if err := os.MkdirAll(cfg.BackupDir, 0755); err != nil {
		return fmt.Errorf("failed to create backup directory: %v", err)
	}

	filename := fmt.Sprintf("rana-awais-backup-%s.json", time.Now().Format("2006-01-02_150405"))
	backupPath := filepath.Join(cfg.BackupDir, filename)
	if err := os.WriteFile(backupPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write backup file: %v", err)
	}
	log.Printf("💾 Auto-backup saved: %s", backupPath)

	if cfg.MaxBackups > 0 {
		cleanOldBackups(cfg.BackupDir, cfg.MaxBackups)
	}

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

	for i := 0; i < len(infos); i++ {
		for j := i + 1; j < len(infos); j++ {
			if infos[j].modTime.Before(infos[i].modTime) {
				infos[i], infos[j] = infos[j], infos[i]
			}
		}
	}

	toDelete := len(infos) - maxBackups
	for i := 0; i < toDelete; i++ {
		os.Remove(infos[i].path)
		log.Printf("🗑️ Removed old backup: %s", infos[i].path)
	}
}

// ═══════════════════════════════════════
// ⚙️ BACKUP SETTINGS
// ═══════════════════════════════════════

func (h *AdminHandler) GetBackupSettings(w http.ResponseWriter, r *http.Request) {
	cfg := loadAutoBackupConfig(h)
	respondJSON(w, http.StatusOK, cfg)
}

func (h *AdminHandler) UpdateBackupSettings(w http.ResponseWriter, r *http.Request) {
	var req AutoBackupConfig
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request", "غلط درخواست")
		return
	}

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
		if err := h.settingsRepo.SetSetting(r.Context(), key, value); err != nil {
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

func (h *AdminHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.settingsRepo.GetAllSettings(r.Context())
	if err != nil {
		respondJSON(w, http.StatusOK, map[string]interface{}{"settings": map[string]string{}})
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"settings": settings})
}

func (h *AdminHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Settings map[string]string `json:"settings"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, r, http.StatusBadRequest, "Invalid request", "غلط درخواست")
		return
	}

	for key, value := range req.Settings {
		if err := h.settingsRepo.SetSetting(r.Context(), key, value); err != nil {
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
// 🔑 LICENSE VALIDATION
// ═══════════════════════════════════════

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

	masterKey := "Huziafaish1133@#$%"
	if req.LicenseKey == masterKey {
		// Save license to settings
		h.settingsRepo.SetSetting(r.Context(), "license_key", req.LicenseKey)
		h.settingsRepo.SetSetting(r.Context(), "license_activated", "true")

		// Also save to license collection
		var count int64
		count, _ = h.settingsRepo.CountLicenses(r.Context(), bson.M{"license_key": masterKey})
		if count == 0 {
			h.settingsRepo.CreateLicense(r.Context(), &domain.License{
				LicenseKey: masterKey,
				ClientName: "Permanent License",
				ExpiryDate: "2099-12-31",
				IsActive:   1,
			})
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

func (h *AdminHandler) GetLicenseStatus(w http.ResponseWriter, r *http.Request) {
	activated, err := h.settingsRepo.GetSetting(r.Context(), "license_activated")
	if err == nil && activated == "true" {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"activated": true,
			"valid":     true,
			"message":   "License is active",
		})
		return
	}

	// Check license collection
	valid, err := h.settingsRepo.GetLicenseStatus(r.Context(), middleware.MASTER_LICENSE_KEY)
	if err == nil && valid {
		h.settingsRepo.SetSetting(r.Context(), "license_activated", "true")
		h.settingsRepo.SetSetting(r.Context(), "license_key", middleware.MASTER_LICENSE_KEY)
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"activated": true,
			"valid":     true,
			"message":   "License is active",
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"activated": false,
		"valid":     false,
		"message":   "No active license found. Please activate the software.",
	})
}
