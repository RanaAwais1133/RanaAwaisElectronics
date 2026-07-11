# Task Progress

## Issues to Fix

### Issue 1: Pending Report - Wrong Amount (60k instead of 40k)
- [x] Analyze the pending calculation logic
- [ ] Fix backend `/accounting/pending-total` endpoint to properly calculate pending amounts
- [ ] Fix pending calculation to account for down payments already made
- [ ] Fix pending calculation to check all status variants (active, Active, Open)

### Issue 2: Today's Collection - Revenue Shows Rs. 0
- [x] Analyze the today summary endpoint
- [ ] Fix `/accounting/today` endpoint to properly find payments
- [ ] Fix the date field query to handle all possible field name variants

### Issue 3: Today's Collection Modal - Remove "Today's Collection" line item
- [x] Analyze DashboardSummaryModal.tsx
- [ ] Fix DashboardSummaryModal to not show "Today's Collection" as a separate line item
- [ ] Only show Revenue and Profit

### Issue 4: Loading Speed Optimization
- [x] Analyze current query patterns
- [ ] Add MongoDB indexes for faster queries
- [ ] Optimize the dashboard summary endpoint to run queries in parallel
- [ ] Add caching for frequently accessed data
