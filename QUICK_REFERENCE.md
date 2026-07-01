# Quick Reference Guide - Rana Awais Electronics ERP

## 🚀 Quick Start

### Running the Application

#### Backend
```bash
cd rana-awais-backend
go mod download
go run cmd/server/main.go
# Server runs on :8080
```

#### Frontend
```bash
cd rana-awais-frontend
npm install
npm start
# App runs on :3000
```

#### Environment Setup
```bash
# Backend
export MONGODB_URI="mongodb://localhost:27017"
export JWT_SECRET="your-secret-key"
export APP_PORT=8080

# Frontend
export REACT_APP_API_URL="http://localhost:8080"
```

---

## 📊 Key File Locations

### Frontend Features

| Feature | Main File | Handler | Store |
|---------|-----------|---------|-------|
| Dashboard | `DashboardPage.tsx` | `/dashboard/summary` | Dashboard state |
| Installments | `InstallmentCreate.tsx` | `/installments` | InstallmentStore |
| Payments | `PaymentModal.tsx` | `/installments/payment` | Payment state |
| Reports | `ReportsPage.tsx` | `/accounting/*` | Report state |
| Customers | `CustomerCreate.tsx` | `/customers` | useCustomerStore |
| Products | `ProductList.tsx` | `/products` | useProductStore |
| Receipts | `PaymentReceipt.tsx` | `/receipts` | Receipt state |

### Backend Services

| Service | Location | Handles |
|---------|----------|---------|
| Payment | `service/payment_service.go` | Fine calculation, recording |
| Installment | `service/installment_service.go` | Plan creation, status |
| Accounting | `service/accounting_service.go` | P&L, revenue reports |
| Receipt | `service/receipt_service.go` | Receipt generation |
| Customer | `service/customer_service.go` | Customer CRUD |
| Inventory | `service/inventory_service.go` | Stock management |

---

## 🔗 Common API Calls

### Dashboard
```bash
# Get all dashboard metrics
GET /dashboard/summary

# Response includes:
{
  "todayCollection": { "total": 50000, "count": 5 },
  "totalPending": 250000,
  "activeInstallments": 15,
  "overdueCustomers": 2,
  "todayProfit": 15000,
  ...
}
```

### Create Installment
```bash
POST /installments
Content-Type: application/json

{
  "customerId": "664a1234...",
  "productId": "664a5678...",
  "totalAmount": 100000,
  "downPayment": 20000,
  "numInstallments": 12,
  "installmentAmount": 6667,
  "startDate": "2024-07-01",
  "endDate": "2025-06-30",
  "gracePeriodDays": 2,
  "finePerDay": 100,
  "fineType": "per_day"
}
```

### Record Payment
```bash
POST /installments/payment
Content-Type: application/json

{
  "planId": "664a1234...",
  "installmentNo": 1,
  "amount": 6667,
  "method": "cash",
  "paymentDate": "2024-07-15",
  "collectedBy": "Ahmad",
  "collected_by_id": "user123"
}
```

### Get Reports
```bash
# Profit & Loss
GET /accounting/profit-loss/cash?from=2024-07-01&to=2024-07-31

# Daily Report
GET /reports/daily?date=2024-07-15

# Pending Report
GET /reports/pending

# Product-wise Revenue
GET /accounting/product-wise
```

---

## 🎯 State Management

### Auth Store
```typescript
import { useAuthStore } from '../../store/useAuthStore';

const user = useAuthStore((state) => state.user);
const login = useAuthStore((state) => state.login);
const logout = useAuthStore((state) => state.logout);
```

### Customer Store
```typescript
import { useCustomerStore } from '../../store/useCustomerStore';

const { customers, fetchCustomers } = useCustomerStore();
await fetchCustomers();
```

### Product Store
```typescript
import { useProductStore } from '../../store/useProductStore';

const { products, fetchProducts } = useProductStore();
await fetchProducts();
```

---

## 🛠️ Common Tasks

### Adding a New API Endpoint

**Backend (Go):**
```go
// 1. Add handler in handler/your_handler.go
func (h *YourHandler) YourMethod(w http.ResponseWriter, r *http.Request) {
  // Implementation
  respondJSON(w, http.StatusOK, data)
}

// 2. Register in router.go
router.HandleFunc("/your-endpoint", h.YourMethod).Methods("GET")

// 3. Call from frontend
const response = await api.get('/your-endpoint');
```

### Adding a New Frontend Feature

```typescript
// 1. Create component in src/features/yourfeature/
// 2. Create types in src/types/
// 3. Create store in src/store/ (if needed)
// 4. Add routing in App.tsx
// 5. Add navigation in components/Navigation.tsx
```

### Adding Error Handling

**Frontend:**
```typescript
try {
  const result = await api.post('/endpoint', data);
  toast.success(isUrdu ? 'کامیاب' : 'Success');
} catch (err: any) {
  const msg = err.response?.data?.error || 'Error occurred';
  toast.error(isUrdu ? 'خرابی' : msg);
}
```

**Backend:**
```go
if err != nil {
  respondError(w, r, http.StatusBadRequest, 
    "Error in English", "اردو میں خرابی")
  return
}
```

---

## 📱 Payment Methods Reference

```javascript
const PAYMENT_METHODS = {
  cash: {
    label: 'نقد | Cash',
    code: 'cash',
    requiresReference: false
  },
  bank_transfer: {
    label: 'بینک ٹرانسفر | Bank Transfer',
    code: 'bank_transfer',
    requiresReference: true
  },
  jazzcash: {
    label: 'JazzCash',
    code: 'jazzcash',
    requiresReference: true
  },
  easypaisa: {
    label: 'Easypaisa',
    code: 'easypaisa',
    requiresReference: true
  }
};
```

---

## 🔐 User Roles & Permissions

```javascript
ROLES = {
  admin: 'Full system access',
  manager: 'Management operations',
  staff: 'Limited operations (data entry)'
}
```

### Role-Based Routes
```typescript
// Protect routes in App.tsx
<ProtectedRoute role="admin" path="/users" component={UserManagement} />
<ProtectedRoute role={["admin", "manager"]} path="/reports" component={Reports} />
```

---

## 🐛 Debugging Tips

### Dashboard Not Loading?
```javascript
// Check cache in localStorage
console.log(localStorage.getItem('dashboard_summary_cache'));

// Check API in Network tab
// Look for /dashboard/summary request

// Check console for timeout warning
// ⚠️ Dashboard loading timeout - forcing display
```

### Payment Not Recording?
```javascript
// Backend error in response
console.log(err.response?.data?.error);

// Check if installment exists
GET /installments/{planId}

// Verify payment service logic
// Fine calculation might be rejecting payment
```

### Cache Issues?
```javascript
// Clear all API cache
// In browser console:
localStorage.removeItem('dashboard_summary_cache');

// Or reload with Ctrl+Shift+R (hard refresh)
```

### Login Issues?
```javascript
// Check token in localStorage
console.log(localStorage.getItem('token'));

// Verify JWT structure
// Should start with "eyJ"

// Check expiration
// Tokens may have short TTL
```

---

## 📈 Performance Metrics

### Dashboard Load Time
- Skeleton to display: ~500ms
- Full data load (cached): ~1-2s
- Full data load (fresh): ~5-8s
- Timeout: 5s (shows cached or skeleton)

### API Response Times (Target)
- `/dashboard/summary`: < 2s (15 queries)
- `/installments`: < 1s
- `/customers`: < 800ms
- `/reports/daily`: < 3s

### Cache Effectiveness
- Dashboard: 80-90% cache hit rate (5min TTL)
- API responses: 70% cached (30s TTL)
- Total reduction: 40-50% fewer network requests

---

## 🌐 Internationalization (i18n)

### Language Switching
```typescript
import { useTranslation } from 'react-i18next';

const { t, i18n } = useTranslation();
const isUrdu = i18n.language === 'ur';

// Change language
i18n.changeLanguage('ur'); // Urdu
i18n.changeLanguage('en'); // English

// Use translations
<h1>{t('dashboard')}</h1>
<p>{isUrdu ? 'متن اردو میں' : 'Text in English'}</p>
```

### Adding New Translation
```typescript
// In i18n translation files
{
  "newKey": "English text",
  "urdu": {
    "newKey": "اردو ٹیکسٹ"
  }
}

// Use in component
const message = t('newKey');
```

---

## 📊 Database Queries Reference

### MongoDB Collections

#### Find Installments by Customer
```javascript
db.installments.find({ customer_id: ObjectId("...") })
```

#### Find Payments in Date Range
```javascript
db.payments.find({
  transaction_date: {
    $gte: new Date("2024-07-01"),
    $lt: new Date("2024-08-01")
  }
})
```

#### Calculate Total Pending
```javascript
db.installments.aggregate([
  { $match: { status: "active" } },
  { $group: { _id: null, total: { $sum: "$remaining_amount" } } }
])
```

#### Find Overdue Installments
```javascript
db.installments.find({
  "installments.due_date": { $lt: new Date() },
  "installments.paid": false,
  status: "active"
})
```

---

## 🚨 Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid/expired token | Login again |
| 404 Not Found | Resource doesn't exist | Verify ID |
| 429 Too Many Requests | Rate limit hit | Wait 60s, retry |
| Network error | Connection issues | Check internet |
| Fine calculation wrong | Wrong fineType | Verify fineType in plan |
| Receipt generation fails | Thermal printer down | Check printer connectivity |
| Dashboard timeout | Slow network | Increase timeout or use cache |

---

## 📝 Testing Commands

### Backend Tests
```bash
cd rana-awais-backend
go test ./... -v
go test -run TestPayment ./internal/service
```

### Frontend Tests
```bash
cd rana-awais-frontend
npm test
npm test -- --coverage
```

### Build Commands
```bash
# Backend
go build -o server cmd/server/main.go

# Frontend
npm run build
# Output in: build/
```

---

## 🚀 Deployment Quick Steps

### Production Build

**Backend:**
```bash
cd rana-awais-backend
go build -o server cmd/server/main.go
# Use Dockerfile for containerization
docker build -t rana-awais-api .
```

**Frontend:**
```bash
cd rana-awais-frontend
npm run build
# Output: build/ folder (deploy to CDN/static server)
```

### Environment Variables

**Production Backend:**
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
JWT_SECRET=very-long-random-secret-key
APP_PORT=8080
NODE_ENV=production
CORS_ORIGINS=https://yourdomain.com
```

**Production Frontend:**
```bash
REACT_APP_API_URL=https://api.yourdomain.com
```

---

## 📞 Support References

### Key Contacts in Code
- **Dashboard Issues:** Check `DashboardPage.tsx` (cache + timeout)
- **Payment Issues:** Check `PaymentModal.tsx` + `payment_service.go`
- **API Issues:** Check `utils/api.ts` (interceptors)
- **Auth Issues:** Check `useAuthStore` + `auth_handler.go`

### Debug URLs
```
Frontend: http://localhost:3000
Backend API: http://localhost:8080/api
API Docs: http://localhost:8080/swagger
Database: mongodb://localhost:27017
```

---

## 🎓 Architecture Overview

```
┌─────────────────────────────────────────┐
│        React Frontend (Port 3000)       │
│  ┌──────────────────────────────────┐   │
│  │  Components / Features           │   │
│  │  - Dashboard                     │   │
│  │  - Installments                  │   │
│  │  - Payments                      │   │
│  │  - Reports                       │   │
│  │  - Customers                     │   │
│  └──────────────────────────────────┘   │
│            │                            │
│            ▼                            │
│  ┌──────────────────────────────────┐   │
│  │   Zustand Stores                 │   │
│  │   - Auth, Customer, Product      │   │
│  └──────────────────────────────────┘   │
│            │                            │
│            ▼                            │
│  ┌──────────────────────────────────┐   │
│  │   Axios API Client               │   │
│  │  - Caching (30s)                 │   │
│  │  - Deduplication                 │   │
│  │  - Error Interception            │   │
│  │  - Retry Logic (429)             │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
              │ HTTPS
              ▼
┌─────────────────────────────────────────┐
│    Go Backend API (Port 8080)           │
│  ┌──────────────────────────────────┐   │
│  │  Router (Gorilla Mux)            │   │
│  │  - 14 Handlers                   │   │
│  │  - 50+ Endpoints                 │   │
│  └──────────────────────────────────┘   │
│            │                            │
│            ▼                            │
│  ┌──────────────────────────────────┐   │
│  │  12 Services                     │   │
│  │  - Business Logic                │   │
│  │  - Fine Calculation              │   │
│  │  - Report Generation             │   │
│  └──────────────────────────────────┘   │
│            │                            │
│            ▼                            │
│  ┌──────────────────────────────────┐   │
│  │  MongoDB                         │   │
│  │  - 10+ Collections               │   │
│  │  - Indexed Queries               │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 🎯 Feature Priority Matrix

### High Priority (Core Features)
- ✅ Installment Creation & Management
- ✅ Payment Recording
- ✅ Dashboard Metrics
- ✅ Receipt Generation

### Medium Priority (Important)
- ✅ Financial Reports
- ✅ Inventory Tracking
- ⚠️ SMS/WhatsApp Notifications (partial)
- ✅ Audit Logging

### Low Priority (Enhancement)
- ⚠️ Real Thermal Printer (mock only)
- ⚠️ Advanced Analytics
- ⚠️ Mobile App
- ⚠️ AI Prediction

---

## 📚 Documentation Links

- **API Docs:** `docs/swagger.yaml`
- **Project README:** `README.md`
- **Production Checklist:** `PRODUCTION_READINESS.md`
- **Analysis:** `PROJECT_ANALYSIS.md`
- **Issues:** `TECHNICAL_ISSUES_RECOMMENDATIONS.md`

---

End of Quick Reference Guide
