

## Spot Health & Location Profitability Dashboard

### Database Migrations

**Migration 1**: Add rent fields to `spots` table
```sql
ALTER TABLE public.spots ADD COLUMN rent_fixed_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.spots ADD COLUMN rent_percentage numeric NOT NULL DEFAULT 0;
```

**Migration 2**: Add depreciation to `item_details`
```sql
ALTER TABLE public.item_details ADD COLUMN monthly_depreciation numeric NOT NULL DEFAULT 0;
```

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useSpotHealth.tsx` | Data hook: month-based micro-P&L per spot |
| `src/pages/SpotHealth.tsx` | Leaderboard DataTable with badges and drill-down |
| `src/components/insights/SpotDrillDown.tsx` | Sheet: active setup machines + 3-month net profit bar chart |

### Hook: `useSpotHealth(year, month)`

Fetches in parallel:
1. `spots` with `locations` (name) -- includes new `rent_fixed_amount`, `rent_percentage`
2. `spot_visits` for selected month -- SUM `total_cash_collected` per spot
3. `setups` with `machines` -> `item_details` (via `model_id`) for `monthly_depreciation`
4. `spot_visits` for current + 2 prior months (for drill-down trend)
5. `locations` for filter dropdown

**Per-spot calculations:**
- **Gross Revenue** = SUM(visit cash for month)
- **Rent Cost** = `rent_fixed_amount` + (`gross_revenue * rent_percentage / 100`)
- **Hardware Depreciation** = SUM of `item_details.monthly_depreciation` for each machine in the active setup (via `machine.model_id -> item_details`)
- **Net Spot Profit** = Gross Revenue - Rent Cost - Depreciation
- **Net Margin %** = (Net Spot Profit / Gross Revenue) * 100

**Badges:**
- 🟢 **Prime Real Estate**: Net Margin > 40%
- 🔴 **Relocate Target**: Net Profit < 0
- 🟡 **Renegotiate/Monitor**: Revenue in top 50% of all spots but margin < 15%

Returns: `rows[]`, `getSetupDetails(spotId)`, `getTrend(spotId)`, `locations[]`

### Page Layout (`SpotHealth.tsx`)

Follows same pattern as `ItemAnalytics.tsx`:
- Month/Year picker + Location dropdown filter (URL param `?location=`)
- Sortable DataTable: Spot Name, Gross Revenue, Rent Cost, Depreciation, Net Profit, Net Margin %, Badge
- Default sort: Net Profit desc
- Row click opens `SpotDrillDown` Sheet

### Drill-Down (`SpotDrillDown.tsx`)

- **Active Setup**: Table of machines (serial, model name, depreciation/mo)
- **3-Month Net Profit Trend**: Recharts BarChart (3 bars)

### Modified Files

| File | Change |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Add `{ title: "Spot Health", icon: Target, url: "/insights/spots" }` to `insightsItems` |
| `src/App.tsx` | Add `/insights/spots` route with `PermissionGuard` (`view_analytics`) |

