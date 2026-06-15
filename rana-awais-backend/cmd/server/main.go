package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/handlers"
	"github.com/your-org/rana-awais-backend/config"
	"github.com/your-org/rana-awais-backend/internal/handler"
	"github.com/your-org/rana-awais-backend/internal/middleware"
	"github.com/your-org/rana-awais-backend/internal/repository/mongo"
	"github.com/your-org/rana-awais-backend/internal/service"
	"github.com/your-org/rana-awais-backend/pkg/sms"
	"github.com/your-org/rana-awais-backend/pkg/thermal"
	"github.com/your-org/rana-awais-backend/pkg/whatsapp"
)

func main() {
	cfg := config.Load()
	config.ConnectDB(cfg)

	// --- Repositories ---
	custRepo := mongo.NewCustomerRepository()
	guarRepo := mongo.NewGuarantorRepository()
	prodRepo := mongo.NewProductRepository()
	invRepo := mongo.NewInventoryRepository()
	planRepo := mongo.NewInstallmentRepository()
	payRepo := mongo.NewPaymentRepository()
	accRepo := mongo.NewAccountingRepository()
	notifRepo := mongo.NewNotificationRepository()
	userRepo := mongo.NewUserRepository() // NEW

	// --- Services ---
	custSvc := service.NewCustomerService(custRepo)
	guarSvc := service.NewGuarantorService(guarRepo, custRepo)
	prodSvc := service.NewProductService(prodRepo)
	invSvc := service.NewInventoryService(invRepo)
	planSvc := service.NewInstallmentService(planRepo, payRepo, accRepo, notifRepo, custRepo, invRepo, guarRepo, prodRepo)
	paySvc := service.NewPaymentService(payRepo)
	accSvc := service.NewAccountingService(accRepo, prodRepo)
	userSvc := service.NewUserService(userRepo) // NEW

	smsSender := sms.NewSender(cfg.SMSEndpoint)
	waSender := whatsapp.NewSender(cfg.WhatsAppAPI)
	notifSvc := service.NewNotificationService(notifRepo, planRepo, custRepo, smsSender, waSender)

	printer := thermal.NewPrinter(cfg.ThermalEndpoint)
	recSvc := service.NewReceiptService(payRepo, planRepo, custRepo, printer)

	// --- Router ---
	r := handler.SetupRouter(cfg, custSvc, guarSvc, prodSvc, invSvc, planSvc, paySvc, accSvc, notifSvc, recSvc, userSvc)
	r.Use(middleware.LanguageMiddleware)
	r.Use(middleware.LoggerMiddleware)

	// Rate limiting - 100 requests per minute per IP
	rateLimiter := middleware.NewRateLimiter(100, time.Minute)
	r.Use(rateLimiter.RateLimit)

	// Request body size limit (10MB)
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, 10<<20) // 10MB
			next.ServeHTTP(w, r)
		})
	})

	corsObj := handlers.CORS(
    handlers.AllowedOrigins([]string{"https://rana-awais-electronics-orcin.vercel.app"}),
    handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
    handlers.AllowedHeaders([]string{"Content-Type", "Authorization", "Accept-Language"}),
    handlers.AllowCredentials(),
)

	go scheduleReminders(notifSvc)

	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	fmt.Printf("Rana Awais ERP running on %s\n", addr)
	log.Fatal(http.ListenAndServe(addr, corsObj(r)))
}

func scheduleReminders(notifSvc *service.NotificationService) {
	time.Sleep(10 * time.Second)

	runReminder := func() {
		log.Println("Scheduler: Sending reminders...")
		if err := notifSvc.SendReminders(context.Background()); err != nil {
			log.Printf("Reminder error: %v", err)
		} else {
			log.Println("Reminders sent successfully")
		}
	}

	runReminder()

	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()
	for range ticker.C {
		runReminder()
	}
}
