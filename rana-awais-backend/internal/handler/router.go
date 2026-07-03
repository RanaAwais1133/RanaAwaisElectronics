package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/middleware"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/service"
	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func SetupRouter(
	cfg *config.Config,
	custSvc *service.CustomerService,
	guarSvc *service.GuarantorService,
	prodSvc *service.ProductService,
	invSvc *service.InventoryService,
	planSvc *service.InstallmentService,
	paySvc *service.PaymentService,
	accSvc *service.AccountingService,
	notifSvc *service.NotificationService,
	recSvc *service.ReceiptService,
	userSvc *service.UserService,
) *mux.Router {
	r := mux.NewRouter()

	installmentH := NewInstallmentHandler(planSvc, guarSvc)
	customerH := NewCustomerHandler(custSvc)
	guarantorH := NewGuarantorHandler(guarSvc, custSvc)
	productH := NewProductHandler(prodSvc)
	inventoryH := NewInventoryHandler(invSvc, prodSvc)
	paymentH := NewPaymentHandler(paySvc)
	accountingH := NewAccountingHandler(accSvc)
	notificationH := NewNotificationHandler(notifSvc)
	receiptH := NewReceiptHandler(recSvc, planSvc, custSvc, prodSvc, guarSvc, cfg)
	userH := NewUserHandler(userSvc)
	authH := NewAuthHandler(userSvc, cfg)
	adminH := NewAdminHandler(userSvc)
	reportH := NewReportHandler()
	dashboardH := NewDashboardHandler()

	api := r.PathPrefix("/api").Subrouter()

	// ========== PUBLIC ROUTES ==========
	api.HandleFunc("/health", HealthCheck).Methods("GET")
	api.HandleFunc("/auth/login", authH.Login).Methods("POST")

	// ========== PROTECTED ROUTES ==========
	protected := api.NewRoute().Subrouter()
	protected.Use(middleware.AuthMiddleware(cfg))

	// Admin routes
	admin := protected.PathPrefix("/admin").Subrouter()
	admin.Use(middleware.AdminOnly)
	admin.HandleFunc("/backup", adminH.Backup).Methods("GET")
	admin.HandleFunc("/users", userH.List).Methods("GET")
	admin.HandleFunc("/users", userH.Create).Methods("POST")

	// Password change (any authenticated user)
	protected.HandleFunc("/auth/change-password", userH.ChangePassword).Methods("POST")

	// Audit logs - OPTIMIZED: Use aggregation with $lookup instead of N+1 queries
	protected.HandleFunc("/audit-logs", func(w http.ResponseWriter, r *http.Request) {
		db := config.DB
		coll := db.Collection(config.ColAuditLogs)

		pageStr := r.URL.Query().Get("page")
		limitStr := r.URL.Query().Get("limit")
		page, _ := strconv.Atoi(pageStr)
		limit, _ := strconv.Atoi(limitStr)
		if page < 1 {
			page = 1
		}
		if limit < 1 || limit > 100 {
			limit = 50
		}

		totalCount, _ := coll.CountDocuments(r.Context(), bson.M{})

		skip := int64((page - 1) * limit)

		// OPTIMIZED: Use aggregation with $lookup instead of N+1 queries
		pipeline := mongo.Pipeline{
			{{Key: "$sort", Value: bson.M{"timestamp": -1}}},
			{{Key: "$skip", Value: skip}},
			{{Key: "$limit", Value: int64(limit)}},
			{{Key: "$lookup", Value: bson.M{
				"from":         config.ColUsers,
				"localField":   "user_id",
				"foreignField": "_id",
				"as":           "user",
			}}},
			{{Key: "$addFields", Value: bson.M{
				"user_name": bson.M{
					"$cond": bson.M{
						"if": bson.M{"$gt": bson.A{bson.M{"$size": "$user"}, 0}},
						"then": bson.M{"$ifNull": bson.A{
							bson.M{"$arrayElemAt": bson.A{"$user.display_name", 0}},
							bson.M{"$arrayElemAt": bson.A{"$user.username", 0}},
						}},
						"else": "",
					},
				},
			}}},
			{{Key: "$project", Value: bson.M{"user": 0}}},
		}

		cursor, err := coll.Aggregate(r.Context(), pipeline)
		if err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to load logs", "لاگز لوڈ نہیں ہوئے")
			return
		}
		defer cursor.Close(r.Context())

		var enriched []bson.M
		if err = cursor.All(r.Context(), &enriched); err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to load logs", "لاگز لوڈ نہیں ہوئے")
			return
		}
		if enriched == nil {
			enriched = []bson.M{}
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"logs":  enriched,
			"total": totalCount,
			"page":  page,
			"limit": limit,
		})
	}).Methods("GET")

	// Customers
	protected.HandleFunc("/customers", customerH.List).Methods("GET")
	protected.HandleFunc("/customers", customerH.Create).Methods("POST")
	protected.HandleFunc("/customers/search", customerH.Search).Methods("GET")
	protected.HandleFunc("/customers/{id}", customerH.GetByID).Methods("GET")
	protected.HandleFunc("/customers/{id}", customerH.Update).Methods("PUT")
	protected.HandleFunc("/customers/{id}", customerH.Delete).Methods("DELETE")

	// Guarantors
	protected.HandleFunc("/guarantors", guarantorH.List).Methods("GET")
	protected.HandleFunc("/guarantors", guarantorH.Create).Methods("POST")
	protected.HandleFunc("/guarantors/{id}", guarantorH.GetByID).Methods("GET")
	protected.HandleFunc("/guarantors/{id}", guarantorH.Update).Methods("PUT")
	protected.HandleFunc("/guarantors/{id}", guarantorH.Delete).Methods("DELETE")
	protected.HandleFunc("/guarantors/customer", guarantorH.ListByCustomer).Methods("GET")

	// Products
	protected.HandleFunc("/products", productH.List).Methods("GET")
	protected.HandleFunc("/products", productH.Create).Methods("POST")
	protected.HandleFunc("/products/{id}", productH.GetByID).Methods("GET")
	protected.HandleFunc("/products/{id}", productH.Update).Methods("PUT")
	protected.HandleFunc("/products/{id}", productH.Delete).Methods("DELETE")

	// Inventory
	protected.HandleFunc("/inventory", inventoryH.List).Methods("GET")
	protected.HandleFunc("/inventory", inventoryH.Create).Methods("POST")
	// Specific routes MUST be before /inventory/{id} to avoid route conflict
	protected.HandleFunc("/inventory/ageing", inventoryH.AgeingReport).Methods("GET")
	protected.HandleFunc("/inventory/add-stock", inventoryH.AddStock).Methods("POST")
	protected.HandleFunc("/inventory/remove-stock", inventoryH.RemoveStock).Methods("POST")
	protected.HandleFunc("/inventory/{id}", inventoryH.GetByID).Methods("GET")
	protected.HandleFunc("/inventory/{id}", inventoryH.Update).Methods("PUT")
	protected.HandleFunc("/inventory/{id}", inventoryH.Delete).Methods("DELETE")
	protected.HandleFunc("/inventory/{id}/return", inventoryH.ReturnItem).Methods("PUT")

	// Installments
	protected.HandleFunc("/installments", installmentH.Create).Methods("POST")
	protected.HandleFunc("/installments/payment", installmentH.RecordPayment).Methods("POST")
	protected.HandleFunc("/installments/bulk-payment", installmentH.BulkPayment).Methods("POST")
	protected.HandleFunc("/installments/advance", installmentH.AdvancePayment).Methods("POST")
	protected.HandleFunc("/installments/customer", installmentH.ListByCustomer).Methods("GET")
	protected.HandleFunc("/installments/reschedule", installmentH.Reschedule).Methods("POST")

	// Upcoming installments (MUST be before /installments/{id} to avoid route conflict)
	protected.HandleFunc("/installments/upcoming", func(w http.ResponseWriter, r *http.Request) {

		daysStr := r.URL.Query().Get("days")
		days, err := strconv.Atoi(daysStr)
		if err != nil || days <= 0 {
			days = 1
		}

		now := time.Now()
		today := now.Truncate(24 * time.Hour)
		var start, end time.Time

		switch days {
		case 1:
			start = time.Date(2020, 1, 1, 0, 0, 0, 0, now.Location())
			end = today.AddDate(0, 0, 1)
		case 7:
			weekday := now.Weekday()
			daysUntilSunday := 6 - int(weekday)
			currentWeekEnd := today.AddDate(0, 0, daysUntilSunday+1)
			start = time.Date(2020, 1, 1, 0, 0, 0, 0, now.Location())
			end = currentWeekEnd
		case 30:
			year, month, _ := now.Date()
			currentMonthStart := time.Date(year, month, 1, 0, 0, 0, 0, now.Location())
			start = time.Date(2020, 1, 1, 0, 0, 0, 0, now.Location())
			end = currentMonthStart.AddDate(0, 1, 0)
		default:
			start = today
			end = today.AddDate(0, 0, days)
		}

		db := config.DB
		installmentsColl := db.Collection(config.ColInstallments)

		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{"status": bson.M{"$in": bson.A{"active", "Open"}}}}},

			{{Key: "$unwind", Value: "$installments"}},
			{{Key: "$match", Value: bson.M{
				"installments.paid": false,
				"installments.due_date": bson.M{
					"$gte": start,
					"$lt":  end,
				},
			}}},
			{{Key: "$lookup", Value: bson.M{
				"from":         config.ColCustomers,
				"localField":   "customer_id",
				"foreignField": "_id",
				"as":           "customer",
			}}},
			{{Key: "$unwind", Value: bson.M{"path": "$customer", "preserveNullAndEmptyArrays": true}}},
			{{Key: "$lookup", Value: bson.M{
				"from":         config.ColProducts,
				"localField":   "product_id",
				"foreignField": "_id",
				"as":           "product",
			}}},
			{{Key: "$unwind", Value: bson.M{"path": "$product", "preserveNullAndEmptyArrays": true}}},
			{{Key: "$project", Value: bson.M{
				"id":                 bson.M{"$toString": "$_id"},
				"customer_name":      "$customer.name",
				"customer_urdu":      "$customer.name_urdu",
				"father_name":        "$customer.father_name",
				"phone":              "$customer.phone",
				"cnic":               "$customer.cnic",
				"address":            "$customer.address",
				"address_urdu":       "$customer.address_urdu",
				"product_name":       "$product.name",
				"installment_no":     "$installments.installment_no",
				"due_date":           bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$installments.due_date"}},
				"amount":             "$installments.amount",
				"paid":               "$installments.paid",
				"partial_paid":       "$installments.partial_paid",
				"paid_date":          bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$installments.paid_date"}},
				"total_installments": "$num_installments",
			}}},
			{{Key: "$sort", Value: bson.M{"due_date": 1}}},
		}

		cursor, err := installmentsColl.Aggregate(r.Context(), pipeline)
		if err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to fetch upcoming", "ناکام")
			return
		}
		defer cursor.Close(r.Context())

		var result []bson.M
		if err = cursor.All(r.Context(), &result); err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "ناکام")
			return
		}
		if result == nil {
			result = []bson.M{}
		}

		respondJSON(w, http.StatusOK, result)
	}).Methods("GET")

	// Installment by ID and Delete (must be after /installments/upcoming to avoid route conflict)
	protected.HandleFunc("/installments/{id}", installmentH.GetByID).Methods("GET")
	protected.HandleFunc("/installments/{id}", installmentH.Delete).Methods("DELETE")

	// Detailed report

	protected.HandleFunc("/installments/detailed-report", func(w http.ResponseWriter, r *http.Request) {
		daysStr := r.URL.Query().Get("days")
		days, err := strconv.Atoi(daysStr)
		if err != nil || days <= 0 {
			days = 1
		}

		now := time.Now()
		today := now.Truncate(24 * time.Hour)
		var start, end time.Time

		switch days {
		case 1:
			start = time.Date(2020, 1, 1, 0, 0, 0, 0, now.Location())
			end = today.AddDate(0, 0, 1)
		case 7:
			weekday := now.Weekday()
			daysUntilSunday := 6 - int(weekday)
			currentWeekEnd := today.AddDate(0, 0, daysUntilSunday+1)
			start = time.Date(2020, 1, 1, 0, 0, 0, 0, now.Location())
			end = currentWeekEnd
		case 30:
			year, month, _ := now.Date()
			currentMonthStart := time.Date(year, month, 1, 0, 0, 0, 0, now.Location())
			start = time.Date(2020, 1, 1, 0, 0, 0, 0, now.Location())
			end = currentMonthStart.AddDate(0, 1, 0)
		default:
			start = today
			end = today.AddDate(0, 0, days)
		}

		db := config.DB
		installmentsColl := db.Collection(config.ColInstallments)
		paymentsColl := db.Collection(config.ColPayments)
		guarColl := db.Collection(config.ColGuarantors)

		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{"status": "active"}}},
			{{Key: "$addFields", Value: bson.M{
				"has_due_in_range": bson.M{
					"$anyElementTrue": bson.A{
						bson.M{"$map": bson.M{
							"input": "$installments",
							"as":    "inst",
							"in": bson.M{
								"$and": bson.A{
									bson.M{"$eq": bson.A{"$$inst.paid", false}},
									bson.M{"$gte": bson.A{"$$inst.due_date", start}},
									bson.M{"$lt": bson.A{"$$inst.due_date", end}},
								},
							},
						}},
					},
				},
			}}},
			{{Key: "$match", Value: bson.M{"has_due_in_range": true}}},
			{{Key: "$project", Value: bson.M{"has_due_in_range": 0}}},
			{{Key: "$lookup", Value: bson.M{
				"from":         config.ColCustomers,
				"localField":   "customer_id",
				"foreignField": "_id",
				"as":           "customer",
			}}},
			{{Key: "$unwind", Value: bson.M{"path": "$customer", "preserveNullAndEmptyArrays": true}}},
			{{Key: "$lookup", Value: bson.M{
				"from":         config.ColProducts,
				"localField":   "product_id",
				"foreignField": "_id",
				"as":           "product",
			}}},
			{{Key: "$unwind", Value: bson.M{"path": "$product", "preserveNullAndEmptyArrays": true}}},
			{{Key: "$addFields", Value: bson.M{
				"installments": bson.M{
					"$filter": bson.M{
						"input": "$installments",
						"as":    "inst",
						"cond": bson.M{
							"$or": bson.A{
								bson.M{
									"$and": bson.A{
										bson.M{"$eq": bson.A{"$$inst.paid", false}},
										bson.M{"$gte": bson.A{"$$inst.due_date", start}},
										bson.M{"$lt": bson.A{"$$inst.due_date", end}},
									},
								},
								bson.M{
									"$and": bson.A{
										bson.M{"$eq": bson.A{"$$inst.paid", true}},
										bson.M{"$gte": bson.A{"$$inst.due_date", start}},
										bson.M{"$lt": bson.A{"$$inst.due_date", end}},
									},
								},
							},
						},
					},
				},
			}}},
		}

		cursor, err := installmentsColl.Aggregate(r.Context(), pipeline)
		if err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to fetch detailed report", "ناکام")
			return
		}
		defer cursor.Close(r.Context())

		var plans []bson.M
		if err = cursor.All(r.Context(), &plans); err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "ناکام")
			return
		}

		type enrichedPlan struct {
			ID              string   `json:"id"`
			CustomerName    string   `json:"customer_name"`
			CustomerUrdu    string   `json:"customer_urdu"`
			FatherName      string   `json:"father_name"`
			Phone           string   `json:"phone"`
			CNIC            string   `json:"cnic"`
			Address         string   `json:"address"`
			AddressUrdu     string   `json:"address_urdu"`
			ProductName     string   `json:"product_name"`
			ProductNameUrdu string   `json:"product_name_urdu"`
			TotalAmount     float64  `json:"total_amount"`
			DownPayment     float64  `json:"down_payment"`
			Remaining       float64  `json:"remaining_amount"`
			NumInstallments int      `json:"num_installments"`
			Installments    []bson.M `json:"installments"`
			Payments        []bson.M `json:"payments"`
			Guarantors      []bson.M `json:"guarantors"`
			CreatedAt       string   `json:"created_at"`
			CreatedBy       string   `json:"created_by"`
		}

		var result []enrichedPlan
		for _, plan := range plans {
			planOID, ok := plan["_id"].(primitive.ObjectID)
			if !ok {
				continue
			}
			planIdStr := planOID.Hex()

			var payments []bson.M
			payCursor, err := paymentsColl.Find(r.Context(), bson.M{"installment_plan_id": planOID}, options.Find().SetSort(bson.M{"transaction_date": 1}))
			if err == nil {
				payCursor.All(r.Context(), &payments)
				payCursor.Close(r.Context())
			}
			if payments == nil {
				payments = []bson.M{}
			}

			var guarantors []bson.M
			if customer, ok := plan["customer"].(bson.M); ok {
				if guarIdsRaw, ok := customer["guarantor_ids"]; ok {
					var guarOIDs []primitive.ObjectID
					if arr, ok := guarIdsRaw.(bson.A); ok {
						for _, item := range arr {
							switch v := item.(type) {
							case primitive.ObjectID:
								guarOIDs = append(guarOIDs, v)
							case string:
								if oid, err := primitive.ObjectIDFromHex(v); err == nil {
									guarOIDs = append(guarOIDs, oid)
								}
							}
						}
					}
					if len(guarOIDs) > 0 {
						guarCursor, err := guarColl.Find(r.Context(), bson.M{"_id": bson.M{"$in": guarOIDs}})
						if err == nil {
							guarCursor.All(r.Context(), &guarantors)
							guarCursor.Close(r.Context())
						}
					}
				}
			}
			if guarantors == nil {
				guarantors = []bson.M{}
			}

			var customerName, customerUrdu, fatherName, phone, cnic, address, addressUrdu string
			var createdAt, createdBy string
			if customer, ok := plan["customer"].(bson.M); ok {
				if v, ok := customer["name"].(string); ok {
					customerName = v
				}
				if v, ok := customer["name_urdu"].(string); ok {
					customerUrdu = v
				}
				if v, ok := customer["father_name"].(string); ok {
					fatherName = v
				}
				if v, ok := customer["phone"].(string); ok {
					phone = v
				}
				if v, ok := customer["cnic"].(string); ok {
					cnic = v
				}
				if v, ok := customer["address"].(string); ok {
					address = v
				}
				if v, ok := customer["address_urdu"].(string); ok {
					addressUrdu = v
				}
			}
			if v, ok := plan["created_at"]; ok {
				if t, ok := v.(time.Time); ok {
					createdAt = t.Format("2006-01-02")
				}
			}
			if v, ok := plan["created_by"]; ok {
				if s, ok := v.(string); ok {
					createdBy = s
				}
			}

			var productName, productNameUrdu string
			if product, ok := plan["product"].(bson.M); ok {
				if v, ok := product["name"].(string); ok {
					productName = v
				}
				if v, ok := product["name_urdu"].(string); ok {
					productNameUrdu = v
				}
			}

			totalAmount, _ := plan["total_amount"].(float64)
			downPayment, _ := plan["down_payment"].(float64)
			remaining, _ := plan["remaining_amount"].(float64)
			numInst, _ := plan["num_installments"].(int64)

			instList, _ := plan["installments"].(bson.A)
			var insts []bson.M
			for _, inst := range instList {
				if m, ok := inst.(bson.M); ok {
					insts = append(insts, m)
				}
			}
			if insts == nil {
				insts = []bson.M{}
			}

			result = append(result, enrichedPlan{
				ID:              planIdStr,
				CustomerName:    customerName,
				CustomerUrdu:    customerUrdu,
				FatherName:      fatherName,
				Phone:           phone,
				CNIC:            cnic,
				Address:         address,
				AddressUrdu:     addressUrdu,
				ProductName:     productName,
				ProductNameUrdu: productNameUrdu,
				TotalAmount:     totalAmount,
				DownPayment:     downPayment,
				Remaining:       remaining,
				NumInstallments: int(numInst),
				Installments:    insts,
				Payments:        payments,
				Guarantors:      guarantors,
				CreatedAt:       createdAt,
				CreatedBy:       createdBy,
			})
		}

		if result == nil {
			result = []enrichedPlan{}
		}

		respondJSON(w, http.StatusOK, result)
	}).Methods("GET")

	// Payments
	protected.HandleFunc("/payments/plan/{plan_id}", paymentH.ListByPlan).Methods("GET")

	// Accounting
	protected.HandleFunc("/accounting/today", accountingH.TodaySummary).Methods("GET")
	protected.HandleFunc("/accounting/month", accountingH.MonthSummary).Methods("GET")
	protected.HandleFunc("/accounting/profit-loss/cash", accountingH.ProfitLossCashFlow).Methods("GET")
	protected.HandleFunc("/accounting/profit-loss/accrual", accountingH.ProfitLossAccrual).Methods("GET")
	protected.HandleFunc("/accounting/pending-total", func(w http.ResponseWriter, r *http.Request) {
		db := config.DB
		installmentsColl := db.Collection(config.ColInstallments)

		// First get the total pending amount
		totalPipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{"status": "active"}}},
			{{Key: "$unwind", Value: "$installments"}},
			{{Key: "$match", Value: bson.M{"installments.paid": false}}},
			{{Key: "$group", Value: bson.M{
				"_id": nil,
				"pending_total": bson.M{
					"$sum": bson.M{
						"$subtract": bson.A{
							bson.M{"$add": bson.A{"$installments.amount", "$installments.fine"}},
							"$installments.partial_paid",
						},
					},
				},
			}}},
		}

		totalCursor, err := installmentsColl.Aggregate(r.Context(), totalPipeline)
		if err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to calculate pending total", "ناکام")
			return
		}
		defer totalCursor.Close(r.Context())

		var totalResults []struct {
			PendingTotal float64 `bson:"pending_total"`
		}
		if err = totalCursor.All(r.Context(), &totalResults); err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "ناکام")
			return
		}

		total := 0.0
		if len(totalResults) > 0 {
			total = totalResults[0].PendingTotal
			if total < 0 {
				total = 0
			}
		}

		// Now get customer-wise pending details
		customerPipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{"status": "active"}}},
			{{Key: "$unwind", Value: "$installments"}},
			{{Key: "$match", Value: bson.M{"installments.paid": false}}},
			{{Key: "$group", Value: bson.M{
				"_id": "$customer_id",
				"pending_amount": bson.M{
					"$sum": bson.M{
						"$subtract": bson.A{
							bson.M{"$add": bson.A{"$installments.amount", "$installments.fine"}},
							"$installments.partial_paid",
						},
					},
				},
				"installment_count": bson.M{"$sum": 1},
			}}},
			{{Key: "$lookup", Value: bson.M{
				"from":         config.ColCustomers,
				"localField":   "_id",
				"foreignField": "_id",
				"as":           "customer",
			}}},
			{{Key: "$unwind", Value: bson.M{"path": "$customer", "preserveNullAndEmptyArrays": true}}},
			{{Key: "$project", Value: bson.M{
				"customer_id":        bson.M{"$toString": "$_id"},
				"customer_name":      "$customer.name",
				"customer_name_urdu": "$customer.name_urdu",
				"father_name":        "$customer.father_name",
				"phone":              "$customer.phone",
				"pending_amount":     1,
				"installment_count":  1,
			}}},
			{{Key: "$sort", Value: bson.M{"pending_amount": -1}}},
		}

		custCursor, err := installmentsColl.Aggregate(r.Context(), customerPipeline)
		if err != nil {
			// If customer-wise fails, still return total
			respondJSON(w, http.StatusOK, map[string]interface{}{
				"pending_total": total,
				"customers":     []bson.M{},
			})
			return
		}
		defer custCursor.Close(r.Context())

		var customers []bson.M
		if err = custCursor.All(r.Context(), &customers); err != nil {
			customers = []bson.M{}
		}
		if customers == nil {
			customers = []bson.M{}
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"pending_total": total,
			"customers":     customers,
		})
	}).Methods("GET")

	// Total Paid endpoint - returns total paid amount and customer-wise details
	protected.HandleFunc("/accounting/total-paid", func(w http.ResponseWriter, r *http.Request) {
		db := config.DB
		paymentsColl := db.Collection(config.ColPayments)

		// Get total paid amount
		totalPipeline := mongo.Pipeline{
			{{Key: "$group", Value: bson.M{
				"_id":   nil,
				"total": bson.M{"$sum": "$amount"},
			}}},
		}

		totalCursor, err := paymentsColl.Aggregate(r.Context(), totalPipeline)
		if err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to calculate total paid", "ناکام")
			return
		}
		defer totalCursor.Close(r.Context())

		var totalResults []struct {
			Total float64 `bson:"total"`
		}
		if err = totalCursor.All(r.Context(), &totalResults); err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to parse results", "ناکام")
			return
		}

		total := 0.0
		if len(totalResults) > 0 {
			total = totalResults[0].Total
		}

		// Get customer-wise paid details
		customerPipeline := mongo.Pipeline{
			{{Key: "$group", Value: bson.M{
				"_id": "$customer_id",
				"paid_amount": bson.M{"$sum": "$amount"},
				"payment_count": bson.M{"$sum": 1},
			}}},
			{{Key: "$lookup", Value: bson.M{
				"from":         config.ColCustomers,
				"localField":   "_id",
				"foreignField": "_id",
				"as":           "customer",
			}}},
			{{Key: "$unwind", Value: bson.M{"path": "$customer", "preserveNullAndEmptyArrays": true}}},
			{{Key: "$project", Value: bson.M{
				"customer_id":     bson.M{"$toString": "$_id"},
				"customer_name":   "$customer.name",
				"customer_name_urdu": "$customer.name_urdu",
				"father_name":     "$customer.father_name",
				"phone":           "$customer.phone",
				"paid_amount":     1,
				"payment_count":   1,
			}}},
			{{Key: "$sort", Value: bson.M{"paid_amount": -1}}},
		}

		custCursor, err := paymentsColl.Aggregate(r.Context(), customerPipeline)
		if err != nil {
			respondJSON(w, http.StatusOK, map[string]interface{}{
				"total_paid": total,
				"customers":    []bson.M{},
			})
			return
		}
		defer custCursor.Close(r.Context())

		var customers []bson.M
		if err = custCursor.All(r.Context(), &customers); err != nil {
			customers = []bson.M{}
		}
		if customers == nil {
			customers = []bson.M{}
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"total_paid": total,
			"customers":  customers,
		})
	}).Methods("GET")

	protected.HandleFunc("/accounting/summary", func(w http.ResponseWriter, r *http.Request) {
		basis := r.URL.Query().Get("basis")
		if basis == "" {
			basis = "cash_flow"
		}
		start, end, err := parseDateRange(r)
		if err != nil {
			respondError(w, r, http.StatusBadRequest, "Invalid date range", "غلط تاریخ کی حد")
			return
		}
		coll := config.DB.Collection(config.ColAccounting)

		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{
				"basis": basis,
				"date":  bson.M{"$gte": start, "$lte": end},
			}}},
			{{Key: "$group", Value: bson.M{
				"_id":   "$type",
				"total": bson.M{"$sum": "$amount"},
			}}},
		}
		cursor, err := coll.Aggregate(r.Context(), pipeline)
		if err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to aggregate", "ناکام")
			return
		}
		defer cursor.Close(r.Context())

		var results []struct {
			ID    string  `bson:"_id"`
			Total float64 `bson:"total"`
		}
		if err = cursor.All(r.Context(), &results); err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to parse", "ناکام")
			return
		}

		var income, expense float64
		for _, res := range results {
			if res.ID == "income" {
				income = res.Total
			} else {
				expense = res.Total
			}
		}
		respondJSON(w, http.StatusOK, map[string]interface{}{"total_income": income, "total_expense": expense, "net_profit": income - expense})
	}).Methods("GET")
	protected.HandleFunc("/accounting/product-wise", func(w http.ResponseWriter, r *http.Request) {
		coll := config.DB.Collection(config.ColInstallments)
		pipeline := bson.A{
			bson.M{"$match": bson.M{"status": "active"}},
			bson.M{"$lookup": bson.M{"from": config.ColProducts, "localField": "product_id", "foreignField": "_id", "as": "product"}},
			bson.M{"$unwind": bson.M{"path": "$product", "preserveNullAndEmptyArrays": true}},
			bson.M{"$group": bson.M{
				"_id":   bson.M{"$ifNull": bson.A{"$product.category", "Uncategorized"}},
				"total": bson.M{"$sum": "$total_amount"},
				"count": bson.M{"$sum": 1},
			}},
			bson.M{"$sort": bson.M{"total": -1}},
		}
		cursor, err := coll.Aggregate(r.Context(), pipeline)
		if err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to aggregate", "ڈیٹا حاصل کرنے میں ناکامی")
			return
		}
		var results []bson.M
		if err := cursor.All(r.Context(), &results); err != nil {
			respondError(w, r, http.StatusInternalServerError, "Failed to read results", "نتائج پڑھنے میں ناکامی")
			return
		}
		respondJSON(w, http.StatusOK, results)
	}).Methods("GET")

	// Notifications
	protected.HandleFunc("/notifications/reminders", notificationH.TriggerReminders).Methods("POST")
	protected.HandleFunc("/notifications/send", notificationH.SendSingle).Methods("POST")

	// Receipts
	protected.HandleFunc("/receipts/print/{payment_id}", receiptH.PrintReceipt).Methods("POST")
	protected.HandleFunc("/receipts/download/{plan_id}", receiptH.DownloadReceipt).Methods("GET")

	// Dashboard - with caching
	protected.Handle("/dashboard/summary", middleware.DashboardCache.CacheResponse(http.HandlerFunc(dashboardH.Summary))).Methods("GET")
	protected.HandleFunc("/dashboard/overdue", dashboardH.OverdueDetails).Methods("GET")
	protected.HandleFunc("/dashboard/today-due", dashboardH.TodayDueDetails).Methods("GET")
	protected.HandleFunc("/dashboard/low-stock", dashboardH.LowStockDetails).Methods("GET")
	protected.HandleFunc("/dashboard/monthly-due", dashboardH.MonthlyDueDetails).Methods("GET")
	protected.HandleFunc("/dashboard/activities", dashboardH.RecentActivities).Methods("GET")
	// Full detail endpoints for professional tables - with caching
	protected.Handle("/dashboard/today-due-full", middleware.DashboardCache.CacheResponse(http.HandlerFunc(dashboardH.TodayDueFull))).Methods("GET")
	protected.Handle("/dashboard/overdue-full", middleware.DashboardCache.CacheResponse(http.HandlerFunc(dashboardH.OverdueFull))).Methods("GET")

	// Reports
	protected.HandleFunc("/reports/customers", reportH.CustomerReport).Methods("GET")
	protected.HandleFunc("/reports/daily", reportH.DailyReport).Methods("GET")
	protected.HandleFunc("/reports/weekly", reportH.WeeklyReport).Methods("GET")
	protected.HandleFunc("/reports/monthly", reportH.MonthlyReport).Methods("GET")
	protected.HandleFunc("/reports/date-range", reportH.DateRangeReport).Methods("GET")

	return r
}

func HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}
