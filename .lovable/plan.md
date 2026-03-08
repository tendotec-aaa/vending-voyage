

## Dashboard Command Center - Implementation Plan

No database migrations needed (RPCs already created manually).

### Files to Create

**1. `src/components/dashboard/DashboardAlerts.tsx`**
- Conditionally rendered alert banners at the top of the dashboard
- Two alert types using the `Alert` component with `Collapsible`:
  - **Warehouse Low Stock**: Lists items where `quantity_on_hand < 100` (item name, SKU, warehouse, qty)
  - **Critical Machine Slots**: Lists deployed slots with `current_stock <= 5` (machine serial, location, slot number, stock)
- Each alert is collapsible showing affected items
- Uses `AlertTriangle` icon, destructive variant for critical slots, default for low stock
- Skeleton loading state

**2. `src/components/dashboard/Leaderboard.tsx`**
- Reusable leaderboard card component
- Props: `title`, `items: { name, value, pctChange }[]`, `formatValue: (n) => string`, `isLoading`, `period`, `onPeriodChange`
- Card with header + `Switch` toggle for Weekly/Monthly
- Each row: rank number (1-3), name, formatted value, green/red percentage badge
- Skeleton loading when no data
- Empty state when no items

### Files to Modify

**3. `src/hooks/useDashboardStats.tsx`**
- Accept new param: `leaderboardPeriod: "weekly" | "monthly"`
- Add 4 new `useQuery` calls:
  - **`lowStockItems`**: Query `inventory` joined with `item_details(name, sku)` and `warehouses(name)` where `quantity_on_hand < 100` and `warehouse_id IS NOT NULL`
  - **`criticalSlots`**: Query `machine_slots` where `current_stock <= 5`, joined through `machines(serial_number, status, setup_id)` → `setups(spot_id)` → `spots(location:locations(name))`, filter machines with `status = 'deployed'`
  - **`topSpotsLeaderboard`**: RPC call `get_top_spots_revenue` with WTD or MTD bounds based on `leaderboardPeriod`
  - **`topItemsLeaderboard`**: RPC call `get_top_items_volume` with same bounds
- Derive **stockoutRisk** count from `criticalSlots` data (length of array)
- Derive **ARPM**: `(monthlyRevenue.current ?? 0) / (activeMachines.deployed || 1)` -- guarded against divide-by-zero
- Export all new data + loading flags

**4. `src/pages/Index.tsx`**
- Add `leaderboardPeriod` state alongside existing `issuesPeriod`
- Pass both periods to `useDashboardStats`
- Add `DashboardAlerts` at top (before KPI cards), conditionally rendered
- Expand KPI grid from `lg:grid-cols-4` to `lg:grid-cols-6` (with `md:grid-cols-3`):
  - Existing 4 cards unchanged
  - New Card 5 - **ARPM**: `Calculator` icon, value = `$X.XX`, change = `vs last month` MTD comparison
  - New Card 6 - **Stockout Risk**: `AlertTriangle` icon, value = count, change = `slots below 5 units`
- Add new leaderboard row between chart/issues and recent visits:
  - Two `Leaderboard` cards side-by-side (`lg:grid-cols-2`), sharing the `leaderboardPeriod` toggle
  - Left: "Top Spots ($$)" with currency formatting
  - Right: "Top Items (Volume)" with unit formatting

**5. `src/components/dashboard/MachineIssues.tsx`**
- Update `TicketRow` for visual triage:
  - Open tickets: add `border-destructive/30` border class, red accent styling
  - Completed tickets: add green `CheckCircle` icon and `bg-emerald-500/10 text-emerald-600` "Resolved" badge instead of no badge
- Already has correct pinning/sorting order (open first, completed below divider)

### Layout After Changes

```text
┌─────────────────────────────────────────────────┐
│  [DashboardAlerts - conditional warning banners] │
├────────┬────────┬────────┬────────┬──────┬──────┤
│Monthly │Weekly  │Active  │Active  │ ARPM │Stock-│
│Revenue │Revenue │Machines│ Spots  │      │ out  │
├────────┴────────┴────────┴────────┴──────┴──────┤
│  Revenue Chart (2/3)     │  Machine Issues (1/3) │
├──────────────────────────┴───────────────────────┤
│  Top Spots $$ (1/2)      │  Top Items Vol (1/2)  │
├──────────────────────────┴───────────────────────┤
│  Recent Visits (2/3)     │  Quick Actions (1/3)  │
│                          │  Upcoming Routes      │
└──────────────────────────┴───────────────────────┘
```

### Key Details
- All date boundaries reuse existing `getMonthBounds()` / `getWeekBounds()` helpers with UTC-5 safety
- ARPM divide-by-zero guard: `deployed || 1`
- Critical slots query uses a chain: `machine_slots` → filter `current_stock <= 5` → client-side filter for deployed machines via the joined machine status
- No changes to QuickActions, UpcomingRoutes, RevenueChart, or RecentVisits
- No database migrations

