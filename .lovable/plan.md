

## Monthly Profitability Dashboard (P&L) — With Corrected Accounting

### Accounting Rules (User's Fix Applied)

1. **Gross Revenue** = SUM(`spot_visits.total_cash_collected`) for the month. Cash shortages are already reflected here (lower cash = lower revenue). No double-counting.

2. **COGS** = Cost of items sold (`visit_line_items.units_sold * WAC`) **+** Inventory shrinkage value (`stock_discrepancy` negative differences * WAC). Missing toys are a product loss, not an operating expense.

3. **Gross Profit** = Revenue - COGS

4. **Operating Expenses** = SUM(`operating_expenses`) for the month only. Strictly external bills. No cash shortages, no shrinkage.

5. **Net Profit** = Gross Profit - Operating Expenses

6. **Cash Discrepancy** = Informational-only metric displayed on dashboard but NOT subtracted from Net Profit. Calculated as SUM of `stock_discrepancy.difference` where negative and monetary (or a visit-level cash variance if tracked).

---

### 1. Database Migration

- Create `expense_category` enum and `operating_expenses` table (as previously planned)
- RLS: SELECT gated by `has_permission(auth.uid(), 'view_profits')` OR admin; mutations gated by admin or `manage_expenses` permission
- Add `manage_expenses` permission key

### 2. New Files

| File | Purpose |
|------|---------|
| `src/hooks/useProfitability.tsx` | Aggregation hook for selected month |
| `src/pages/Profitability.tsx` | P&L dashboard page |
| `src/components/profitability/AddExpenseDialog.tsx` | Expense entry form dialog |
| `src/components/profitability/ExpenseBreakdownChart.tsx` | Recharts donut chart |

### 3. Data Hook (`useProfitability`)

Takes `year`, `month`. Fetches in parallel:

- **Revenue**: `spot_visits` filtered by month, SUM `total_cash_collected`
- **Units Sold COGS**: `visit_line_items` joined to `spot_visits` (month filter) — group by `product_id`, SUM `units_sold`. Multiply each by WAC from `purchase_items` batch data
- **Shrinkage COGS**: `stock_discrepancy` where `occurrence_date` in month AND `difference < 0` — group by `item_detail_id`, SUM absolute `difference`. Multiply each by WAC. Added to COGS total
- **Operating Expenses**: `operating_expenses` where `expense_date` in month, grouped by category
- **Cash Discrepancy (info only)**: Computed from visit-level variance or `stock_discrepancy` with monetary flag — displayed but excluded from P&L math

Returns: `grossRevenue`, `cogs`, `shrinkageValue`, `grossProfit`, `totalOpex`, `netProfit`, `cashDiscrepancy`, `expensesByCategory`, `expensesList`

### 4. Page Layout

- Month/year picker (defaults to current month)
- **5 Summary Cards**: Gross Revenue, COGS (with shrinkage note), Gross Profit, Total OpEx, Net Profit (green/red)
- **Informational badge**: "Cash Discrepancy: $X" — not in P&L math
- **Two-column below**: Left = donut chart (expense categories), Right = expense ledger table + "Add Expense" button

### 5. Modified Files

| File | Change |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Add "Profitability" to `insightsItems` with `TrendingUp` icon, gate by `view_profits` |
| `src/App.tsx` | Add `/insights/profitability` route with `PermissionGuard` |
| `src/hooks/usePermissions.tsx` | Add `manage_expenses` permission key |

