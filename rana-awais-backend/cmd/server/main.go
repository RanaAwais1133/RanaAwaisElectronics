package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/handler"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/middleware"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository/mongo"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/sms"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/thermal"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/whatsapp"
)

func main() {
	// ═══════════════════════════════════════
	// 📋 CONFIG & DB
	// ═══════════════════════════════════════
	cfg := config.Load()
	config.ConnectDB(cfg)

	fmt.Println(strings.Repeat("═", 55))
	fmt.Printf("🚀 %s Starting...\n", cfg.AppName)
	fmt.Println(strings.Repeat("═", 55))

	// ═══════════════════════════════════════
	// 🗄️ REPOSITORIES
	// ═══════════════════════════════════════
	custRepo := mongo.NewCustomerRepository()
	guarRepo := mongo.NewGuarantorRepository()
	prodRepo := mongo.NewProductRepository()
	invRepo := mongo.NewInventoryRepository()
	planRepo := mongo.NewInstallmentRepository()
	payRepo := mongo.NewPaymentRepository()
	accRepo := mongo.NewAccountingRepository()
	notifRepo := mongo.NewNotificationRepository()
	userRepo := mongo.NewUserRepository()

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
	// 🛣️ ROUTER SETUP
	// ═══════════════════════════════════════
	r := handler.SetupRouter(cfg, custSvc, guarSvc, prodSvc, invSvc, planSvc, paySvc, accSvc, notifSvc, recSvc, userSvc)
	r.Use(middleware.LanguageMiddleware)
	r.Use(middleware.LoggerMiddleware)

	// Gzip compression for faster response times (up to 80% size reduction)
	r.Use(middleware.GzipCompressionMiddleware)

	// Rate limiting
	rateLimitRequests := cfg.RateLimitRequests
	if rateLimitRequests <= 0 {
		rateLimitRequests = 1000
	}
	rateLimiter := middleware.NewRateLimiter(rateLimitRequests, time.Minute)
	r.Use(rateLimiter.RateLimit)

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
	// ⏰ KEEP-ALIVE (Prevent Render free tier cold starts)
	// ═══════════════════════════════════════
	go middleware.StartKeepAlive(cfg.ServerPort)

	// ═══════════════════════════════════════
	// 🖥️ START SERVER
	// ═══════════════════════════════════════
	addr := fmt.Sprintf(":%s", cfg.ServerPort)

	srv := &http.Server{
		Addr:         addr,
		Handler:      corsMiddleware(r),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		fmt.Printf("   ✅ Server running on http://localhost%s\n", addr)
		fmt.Println(strings.Repeat("═", 55))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ Server failed to start: %v", err)
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

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("❌ Server forced to shutdown: %v", err)
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
