# Task Progress - DownPayment Profit Fix & Payment Type Column

## Todo List
- [x] Analyze codebase and identify all issues
- [x] Fix 1: `accounting_handler.go` - Add `payment_type` field in `getPaymentDetailsWithProfit` response
- [x] Fix 2: `dashboard_handler.go` - Fix Summary function profit calculation (todayProfit, monthProfit)
- [x] Fix 3: `dashboard_handler.go` - Fix MonthlyReport function to include Advance/Down payments in collected/remaining
- [x] Fix 4: `DashboardSummaryModal.tsx` - Add "Type" column in payment details table and print view
- [x] Build and test the backend
- [x] Verify all fixes work correctly
