# Task Progress - Fix All Reports & Dashboard

## Issues Found:

### 1. CustomerReport.tsx (Daily/Weekly/Monthly/Date-to-Date)
- Uses `/accounting/today`, `/accounting/month`, `/accounting/profit-loss/cash` endpoints
- These endpoints return only `{revenue, profit}` or `{profit}` - NOT the full report data
- Frontend expects: `total_sales`, `pending`, `customers`, `cash_in_hand`, `bank_deposit`, `open_accounts`, `closed_accounts`, `total_outstanding`, `transactions`, `recoveryRate`
- **Fix**: Use the actual `/reports/daily`, `/reports/weekly`, `/reports/monthly`, `/reports/date-range` endpoints

### 2. Backend report_handler.go - Missing fields
- DailyReport, WeeklyReport, MonthlyReport, DateRangeReport don't return:
  - `cashInHand`, `bankDeposit`, `recoveryRate`, `openAccounts`, `closedAccounts`, `netAccounts`, `totalOutstanding`
- **Fix**: Add all these fields to the report responses

### 3. Inventory Report - Field name mismatch
- Backend returns: `purchasePrice` (camelCase), `product_name`, `product_urdu`
- Frontend expects: `purchase_price` (snake_case), `product_name`, `product_name_urdu`
- **Fix**: Update backend to return `purchase_price` and `product_name_urdu` OR update frontend to match

### 4. Profit & Loss - Profit shows Rs. 0
- `GetRevenueAndProfit` calculates profit from sold inventory items with `sold_date` in range
- If items don't have `sold_date` set, profit = 0
- **Fix**: Calculate profit as revenue - expenses from accounting entries, or use a fallback

### 5. Accounting handler - Today/Month endpoints return minimal data
- `/accounting/today` returns `{revenue, profit}` only
- `/accounting/month` returns `{revenue, profit}` only
- **Fix**: Add more fields to these responses

## Plan:
- [ ] Fix backend report_handler.go - add cashInHand, bankDeposit, recoveryRate, openAccounts, closedAccounts, netAccounts, totalOutstanding
- [ ] Fix backend inventory_handler.go - return purchase_price (snake_case) and product_name_urdu
- [ ] Fix backend accounting_handler.go - add more fields to today/month responses
- [ ] Fix frontend CustomerReport.tsx - use /reports/daily, /reports/weekly, /reports/monthly, /reports/date-range endpoints
- [ ] Fix frontend InventoryReport.tsx - match field names from backend
- [ ] Verify backend compiles
