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
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository/dual"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository/mongodb"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository/sqlite"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/sms"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/thermal"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/whatsapp"
	"github.com/gorilla/mux"
)


// generateSelfSignedCert creates a self-signed TLS certificate for HTTPS
func generateSelfSignedCert(certFile, keyFile string) error {
	// Generate RSA private key
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return fmt.Errorf("failed to generate private key: %w", err)
	}

	// Create certificate template
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
		NotAfter:              time.Now().Add(10 * 365 * 24 * time.Hour), // 10 years validity
		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		DNSNames:              []string{"localhost", "127.0.0.1"},
		IPAddresses:           []net.IP{net.ParseIP("127.0.0.1")},
	}

	// Self-sign the certificate
	derBytes, err := x509.CreateCertificate(rand.Reader, template, template, &privateKey.PublicKey, privateKey)
	if err != nil {
		return fmt.Errorf("failed to create certificate: %w", err)
	}

	// Write certificate file
	certOut, err := os.Create(certFile)
	if err != nil {
		return fmt.Errorf("failed to open cert file for writing: %w", err)
	}
	defer certOut.Close()
	if err := pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: derBytes}); err != nil {
		return fmt.Errorf("failed to write cert: %w", err)
	}

	// Write key file
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
	// Use os.Args[0] first (the actual command used to launch)
	exePath := os.Args[0]
	// If it's a relative path, resolve it against the current working directory
	if !filepath.IsAbs(exePath) {
		if cwd, err := os.Getwd(); err == nil {
			exePath = filepath.Join(cwd, exePath)
		}
	}
	// Also try os.Executable() as fallback
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
	// 📋 CONFIG & DB
	// ═══════════════════════════════════════
	cfg := config.Load()

	// Set the global flag for DBHelper
	config.UseMongoDB = cfg.UseMongoDB

	// Connect to the appropriate database
	if cfg.UseMongoDB {
		config.ConnectMongoDB(cfg)
	} else {
		config.ConnectDB(cfg)
	}


	fmt.Println(strings.Repeat("═", 55))
	fmt.Printf("🚀 %s Starting...\n", cfg.AppName)
	fmt.Println(strings.Repeat("═", 55))

	// ═══════════════════════════════════════
	// 🔑 LICENSE VALIDATION - DISABLED
	// ═══════════════════════════════════════
	log.Println("🔓 License validation DISABLED - free access for all users")

	// ═══════════════════════════════════════
	// ️ REPOSITORIES (SQLite or MongoDB)
	// ═══════════════════════════════════════
	var custRepo repository.CustomerRepository
	var guarRepo repository.GuarantorRepository
	var prodRepo repository.ProductRepository
	var invRepo repository.InventoryRepository
	var planRepo repository.InstallmentRepository
	var payRepo repository.PaymentRepository
	var accRepo repository.AccountingRepository
	var notifRepo repository.NotificationRepository
	var userRepo repository.UserRepository


	if cfg.UseMongoDB {
		db := config.MongoDatabase
		custRepo = mongodb.NewCustomerRepository(db)
		guarRepo = mongodb.NewGuarantorRepository(db)
		prodRepo = mongodb.NewProductRepository(db)
		invRepo = mongodb.NewInventoryRepository(db)
		planRepo = mongodb.NewInstallmentRepository(db)
		payRepo = mongodb.NewPaymentRepository(db)
		accRepo = mongodb.NewAccountingRepository(db)
		notifRepo = mongodb.NewNotificationRepository(db)
		userRepo = mongodb.NewUserRepository(db)
		log.Println("🍃 Using MongoDB Atlas repositories")
	} else {
		db := config.DB
		custRepo = sqlite.NewCustomerRepository(db)
		guarRepo = sqlite.NewGuarantorRepository(db)
		prodRepo = sqlite.NewProductRepository(db)
		invRepo = sqlite.NewInventoryRepository(db)
		planRepo = sqlite.NewInstallmentRepository(db)
		payRepo = sqlite.NewPaymentRepository(db)
		accRepo = sqlite.NewAccountingRepository(db)
		notifRepo = sqlite.NewNotificationRepository(db)
		userRepo = sqlite.NewUserRepository(db)
		log.Println("🗄️  Using SQLite repositories")
	}

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

	smsSender := sms.NewSender(cfg.SMSEndpoint)
	waSender := whatsapp.NewSender(cfg.WhatsAppAPI)
	notifSvc := service.NewNotificationService(notifRepo, planRepo, custRepo, smsSender, waSender)

	printer := thermal.NewPrinter(cfg.ThermalEndpoint)
	recSvc := service.NewReceiptService(payRepo, planRepo, custRepo, printer)
	recSvc.SetConfig(cfg)


	// ═══════════════════════════════════════
	// 🔄 SYNC ENGINE SETUP (Dual DB mode)
	// ═══════════════════════════════════════
	var syncEngine *dual.SyncEngine
	var syncHandler *handler.SyncHandler

	if cfg.UseMongoDB {
		// Create sync log repos for both databases
		localSyncRepo := sqlite.NewSyncLogRepository(config.DB)
		cloudSyncRepo := mongodb.NewSyncLogRepository(config.MongoDatabase)

		// Create dual repositories
		_, engine := dual.NewDualRepositories(
			custRepo, custRepo,
			guarRepo, guarRepo,
			prodRepo, prodRepo,
			invRepo, invRepo,
			planRepo, planRepo,
			payRepo, payRepo,
			accRepo, accRepo,
			notifRepo, notifRepo,
			userRepo, userRepo,
			localSyncRepo, cloudSyncRepo,
		)
		syncEngine = engine
		syncHandler = handler.NewSyncHandler(syncEngine, localSyncRepo)

		// Start the sync engine
		syncEngine.Start()
		log.Println("🔄 Dual DB Sync Engine initialized")
	} else {
		// SQLite only mode - create a no-op sync handler
		localSyncRepo := sqlite.NewSyncLogRepository(config.DB)
		syncHandler = handler.NewSyncHandler(nil, localSyncRepo)
	}

	// ═══════════════════════════════════════
	// 🛣️ ROUTER SETUP
	// ═══════════════════════════════════════
	adminH := handler.NewAdminHandler(userSvc)
	r := handler.SetupRouter(cfg, custSvc, guarSvc, prodSvc, invSvc, planSvc, paySvc, accSvc, notifSvc, recSvc, userSvc, syncHandler)
	r.Use(middleware.LanguageMiddleware)
	r.Use(middleware.LoggerMiddleware)

	// ═══════════════════════════════════════
	// 🗜️ GZIP COMPRESSION (before frontend to compress API responses)
	// ═══════════════════════════════════════
	r.Use(middleware.GzipCompressionMiddleware)

	// ═══════════════════════════════════════
	// 🌐 SERVE FRONTEND STATIC FILES
	// ═══════════════════════════════════════
	// Try multiple paths for the frontend build
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
	if frontendDir != "" {
		log.Printf("🌐 Serving frontend from: %s", frontendDir)
		// Create a file server for the frontend
		fs := http.FileServer(http.Dir(frontendDir))
		// Serve static files with proper prefix stripping
		r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir(filepath.Join(frontendDir, "static")))))
		// Wrap the router with SPA fallback - this runs AFTER the mux router has tried all routes
		// This avoids route conflicts between the API subrouter and the SPA catch-all
		originalHandler := r
		r = mux.NewRouter()
		r.PathPrefix("/api/").Handler(originalHandler)
		r.PathPrefix("/").Handler(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			// Try the requested path, fall back to index.html
			path := filepath.Join(frontendDir, req.URL.Path)
			if _, err := os.Stat(path); os.IsNotExist(err) {
				// SPA fallback - serve index.html
				http.ServeFile(w, req, filepath.Join(frontendDir, "index.html"))
			} else {
				fs.ServeHTTP(w, req)
			}
		}))
	} else {
		log.Println("⚠️  Frontend build not found, API only mode")
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
	// 🌐 CORS - Use custom middleware for multi-origin support
	// ═══════════════════════════════════════
	corsMiddleware := middleware.CORSMiddleware(cfg)

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

	// ✅ Try to use mkcert certificate first (browser-trusted)
	certFile := cfg.TLSCertFile
	keyFile := cfg.TLSKeyFile

	// Look for mkcert-generated certificates (they have the IP in the name)
	mkcertCerts := []string{
		"192.168.1.1+3.pem",
		"192.168.1.1+3-key.pem",
		"localhost+2.pem",
		"localhost+2-key.pem",
		"localhost.pem",
		"localhost-key.pem",
	}
	if cfg.EnableHTTPS {
		// Check if mkcert certs exist in the current directory
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

		// If no mkcert cert found, generate self-signed
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

	// Create separate servers for HTTP and HTTPS
	httpsSrv := &http.Server{
		Addr:         addr,
		Handler:      corsMiddleware(r),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	httpSrv := &http.Server{
		Addr:         addr,
		Handler:      corsMiddleware(r),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// ✅ Start HTTPS server (if enabled)
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

	// ✅ Always start HTTP server (for localhost access + redirect)
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

	// Shutdown both servers
	if cfg.EnableHTTPS {
		if err := httpsSrv.Shutdown(shutdownCtx); err != nil {
			log.Printf("⚠️ HTTPS server shutdown error: %v", err)
		}
	}
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		log.Printf("⚠️ HTTP server shutdown error: %v", err)
	}

	// Close database connections
	if config.DB != nil {
		config.DB.Close()
	}
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
