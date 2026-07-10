package main

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/handler"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/middleware"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository/mongodb"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/sms"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/thermal"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/whatsapp"
	"github.com/gorilla/mux"
)

// generateSelfSignedCert creates a self-signed TLS certificate for HTTPS
func generateSelfSignedCert(certFile, keyFile string) error {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return fmt.Errorf("failed to generate private key: %w", err)
	}

	serialNumber, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return fmt.Errorf("failed to generate serial number: %w", err)
	}

	template := &x509.Certificate{
		SerialNumber: serialNumber,
		Subject: pkix.Name{
			Organization: []string{"Rana Awais Electronics"},
			CommonName:   "localhost",
		},
		NotBefore:             time.Now(),
		NotAfter:              time.Now().Add(10 * 365 * 24 * time.Hour),
		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		DNSNames:              []string{"localhost", "127.0.0.1"},
		IPAddresses:           []net.IP{net.ParseIP("127.0.0.1")},
	}

	derBytes, err := x509.CreateCertificate(rand.Reader, template, template, &privateKey.PublicKey, privateKey)
	if err != nil {
		return fmt.Errorf("failed to create certificate: %w", err)
	}

	certOut, err := os.Create(certFile)
	if err != nil {
		return fmt.Errorf("failed to open cert file for writing: %w", err)
	}
	defer certOut.Close()
	if err := pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: derBytes}); err != nil {
		return fmt.Errorf("failed to write cert: %w", err)
	}

	keyOut, err := os.Create(keyFile)
	if err != nil {
		return fmt.Errorf("failed to open key file for writing: %w", err)
	}
	defer keyOut.Close()
	privBytes := x509.MarshalPKCS1PrivateKey(privateKey)
	if err := pem.Encode(keyOut, &pem.Block{Type: "RSA PRIVATE KEY", Bytes: privBytes}); err != nil {
		return fmt.Errorf("failed to write key: %w", err)
	}

	return nil
}

func main() {
	// ═══════════════════════════════════════
	// 📂 CHANGE TO EXE DIRECTORY
	// ═══════════════════════════════════════
	exePath := os.Args[0]
	if !filepath.IsAbs(exePath) {
		if cwd, err := os.Getwd(); err == nil {
			exePath = filepath.Join(cwd, exePath)
		}
	}
	if exePath2, err := os.Executable(); err == nil {
		if filepath.IsAbs(exePath2) {
			exePath = exePath2
		}
	}
	exeDir := filepath.Dir(exePath)
	if info, err := os.Stat(exeDir); err == nil && info.IsDir() {
		if err := os.Chdir(exeDir); err == nil {
			log.Printf("📂 Working directory set to: %s", exeDir)
		}
	}

	// ═══════════════════════════════════════
	// 📋 CONFIG & DB (MongoDB Atlas only)
	// ═══════════════════════════════════════
	cfg := config.Load()

	// Connect to MongoDB Atlas
	config.ConnectMongoDB(cfg)

	fmt.Println(strings.Repeat("═", 55))
	fmt.Printf("🚀 %s Starting...\n", cfg.AppName)
	fmt.Println(strings.Repeat("═", 55))

	// ═══════════════════════════════════════
	// 🔑 LICENSE VALIDATION - DISABLED
	// ═══════════════════════════════════════
	log.Println("🔓 License validation DISABLED - free access for all users")

	// ═══════════════════════════════════════
	// 🍃 REPOSITORIES (MongoDB Atlas only)
	// ═══════════════════════════════════════
	db := config.MongoDatabase

	var custRepo repository.CustomerRepository = mongodb.NewCustomerRepository(db)
	var guarRepo repository.GuarantorRepository = mongodb.NewGuarantorRepository(db)
	var prodRepo repository.ProductRepository = mongodb.NewProductRepository(db)
	var invRepo repository.InventoryRepository = mongodb.NewInventoryRepository(db)
	var planRepo repository.InstallmentRepository = mongodb.NewInstallmentRepository(db)
	var payRepo repository.PaymentRepository = mongodb.NewPaymentRepository(db)
	var accRepo repository.AccountingRepository = mongodb.NewAccountingRepository(db)
	var notifRepo repository.NotificationRepository = mongodb.NewNotificationRepository(db)
	var userRepo repository.UserRepository = mongodb.NewUserRepository(db)
	var expenseRepo repository.ExpenseRepository = mongodb.NewExpenseRepository(db)
	var settingsRepo repository.SettingsRepository = mongodb.NewSettingsRepository(db)

	log.Println("🍃 Using MongoDB Atlas repositories (pure cloud mode)")

	// ═══════════════════════════════════════
	// ⚙️ SERVICES
	// ═══════════════════════════════════════
	custSvc := service.NewCustomerService(custRepo)
	guarSvc := service.NewGuarantorService(guarRepo, custRepo)
	prodSvc := service.NewProductService(prodRepo)
	invSvc := service.NewInventoryService(invRepo)
	planSvc := service.NewInstallmentService(planRepo, payRepo, accRepo, notifRepo, custRepo, invRepo, guarRepo, prodRepo)
	paySvc := service.NewPaymentService(payRepo)
	accSvc := service.NewAccountingService(accRepo, prodRepo)
	userSvc := service.NewUserService(userRepo)
	expenseSvc := service.NewExpenseService(expenseRepo)

	smsSender := sms.NewSender(cfg.SMSEndpoint)
	waSender := whatsapp.NewSender(cfg.WhatsAppAPI)
	notifSvc := service.NewNotificationService(notifRepo, planRepo, custRepo, smsSender, waSender)

	printer := thermal.NewPrinter(cfg.ThermalEndpoint)
	recSvc := service.NewReceiptService(payRepo, planRepo, custRepo, printer)
	recSvc.SetConfig(cfg)

	// ═══════════════════════════════════════
	// 🛣️ ROUTER SETUP
	// ═══════════════════════════════════════
	adminH := handler.NewAdminHandler(userSvc, settingsRepo)
	r := handler.SetupRouter(cfg, custSvc, guarSvc, prodSvc, invSvc, planSvc, paySvc, accSvc, notifSvc, recSvc, userSvc, expenseSvc, settingsRepo)
	r.Use(middleware.LanguageMiddleware)
	r.Use(middleware.LoggerMiddleware)

	// ═══════════════════════════════════════
	// 🗜️ GZIP COMPRESSION
	// ═══════════════════════════════════════
	r.Use(middleware.GzipCompressionMiddleware)

	// ═══════════════════════════════════════
	// 🌐 CORS MIDDLEWARE WRAPPER
	// ═══════════════════════════════════════
	corsMiddleware := middleware.CORSMiddleware(cfg)

	// ═══════════════════════════════════════
	// 🌐 SERVE FRONTEND STATIC FILES
	// ═══════════════════════════════════════
	frontendPaths := []string{
		"frontend",
		"../frontend",
		filepath.Join(filepath.Dir(os.Args[0]), "frontend"),
		filepath.Join(filepath.Dir(os.Args[0]), "..", "frontend"),
	}
	var frontendDir string
	for _, fp := range frontendPaths {
		if info, err := os.Stat(fp); err == nil && info.IsDir() {
			frontendDir = fp
			break
		}
	}
	// Apply CORS to the API router regardless of frontend
	originalHandler := r
	r = mux.NewRouter()
	r.PathPrefix("/api/").Handler(corsMiddleware(originalHandler))

	if frontendDir != "" {
		log.Printf("🌐 Serving frontend from: %s", frontendDir)
		fs := http.FileServer(http.Dir(frontendDir))
		r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir(filepath.Join(frontendDir, "static")))))
		r.PathPrefix("/").Handler(corsMiddleware(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			path := filepath.Join(frontendDir, req.URL.Path)
			if _, err := os.Stat(path); os.IsNotExist(err) {
				http.ServeFile(w, req, filepath.Join(frontendDir, "index.html"))
			} else {
				fs.ServeHTTP(w, req)
			}
		})))
	} else {
		log.Println("⚠️  Frontend build not found, API only mode")
		// In API-only mode, still wrap with CORS for non-API routes
		r.PathPrefix("/").Handler(corsMiddleware(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"error":"Not found"}`))
		})))
	}

	// Request body size limit
	maxBodySize := cfg.MaxBodySizeMB
	if maxBodySize <= 0 {
		maxBodySize = 10
	}
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, int64(maxBodySize)<<20)
			next.ServeHTTP(w, r)
		})
	})

	// ═══════════════════════════════════════
	// 📅 REMINDER SCHEDULER
	// ═══════════════════════════════════════
	go scheduleReminders(notifSvc)

	// ═══════════════════════════════════════
	// ⏰ AUTO-BACKUP SCHEDULER
	// ═══════════════════════════════════════
	handler.StartAutoBackup(adminH)

	// ═══════════════════════════════════════
	// ⏰ KEEP-ALIVE (Prevent Render free tier cold starts)
	// ═══════════════════════════════════════
	go middleware.StartKeepAlive(cfg.ServerPort)

	// ═══════════════════════════════════════
	// 🖥️ START SERVER (HTTP + HTTPS)
	// ═══════════════════════════════════════
	addr := fmt.Sprintf(":%s", cfg.ServerPort)

	certFile := cfg.TLSCertFile
	keyFile := cfg.TLSKeyFile

	mkcertCerts := []string{
		"192.168.1.1+3.pem",
		"192.168.1.1+3-key.pem",
		"localhost+2.pem",
		"localhost+2-key.pem",
		"localhost.pem",
		"localhost-key.pem",
	}
	if cfg.EnableHTTPS {
		for i := 0; i < len(mkcertCerts); i += 2 {
			certPath := mkcertCerts[i]
			keyPath := mkcertCerts[i+1]
			if _, err := os.Stat(certPath); err == nil {
				if _, err := os.Stat(keyPath); err == nil {
					certFile = certPath
					keyFile = keyPath
					log.Printf("🔐 Using mkcert certificate: %s", certPath)
					break
				}
			}
		}

		if certFile == cfg.TLSCertFile {
			if _, err := os.Stat(certFile); os.IsNotExist(err) {
				log.Println("🔐 Generating self-signed TLS certificate...")
				if err := generateSelfSignedCert(certFile, keyFile); err != nil {
					log.Printf("⚠️  Failed to generate certificate: %v", err)
					log.Println("⚠️  Falling back to HTTP only")
					cfg.EnableHTTPS = false
				} else {
					log.Println("✅ Self-signed certificate generated")
				}
			}
		}
	}

	httpsSrv := &http.Server{
		Addr:         addr,
		Handler:      corsMiddleware(r),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	httpSrv := &http.Server{
		Addr:         addr,
		Handler:      corsMiddleware(r),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	if cfg.EnableHTTPS {
		go func() {
			httpsAddr := addr
			fmt.Printf("   ✅ HTTPS Server running on https://0.0.0.0%s\n", httpsAddr)
			fmt.Println(strings.Repeat("═", 55))
			if err := httpsSrv.ListenAndServeTLS(certFile, keyFile); err != nil && err != http.ErrServerClosed {
				log.Fatalf("❌ HTTPS Server failed to start: %v", err)
			}
		}()
	}

	go func() {
		fmt.Printf("   ✅ HTTP Server running on http://0.0.0.0%s\n", addr)
		fmt.Println(strings.Repeat("═", 55))
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ HTTP Server failed to start: %v", err)
		}
	}()

	// ═══════════════════════════════════════
	// 🛑 GRACEFUL SHUTDOWN
	// ═══════════════════════════════════════
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	fmt.Println()
	fmt.Println(strings.Repeat("═", 55))
	fmt.Println("🛑 Shutting down server gracefully...")
	fmt.Println(strings.Repeat("═", 55))

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if cfg.EnableHTTPS {
		if err := httpsSrv.Shutdown(shutdownCtx); err != nil {
			log.Printf("⚠️ HTTPS server shutdown error: %v", err)
		}
	}
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		log.Printf("⚠️ HTTP server shutdown error: %v", err)
	}

	// Close MongoDB connection
	if config.MongoClient != nil {
		config.CloseMongoDB()
	}

	fmt.Println("   ✅ Server exited gracefully")
	fmt.Println(strings.Repeat("═", 55))
}

// scheduleReminders runs reminder notifications periodically
func scheduleReminders(notifSvc *service.NotificationService) {
	time.Sleep(10 * time.Second)

	runReminder := func() {
		log.Println("📅 Scheduler: Sending payment reminders...")
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if err := notifSvc.SendReminders(ctx); err != nil {
			log.Printf("   ⚠️  Reminder error: %v", err)
		} else {
			log.Println("   ✅ Reminders sent successfully")
		}
	}

	runReminder()
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()
	for range ticker.C {
		runReminder()
	}
}
