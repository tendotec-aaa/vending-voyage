

## Dashboard Real-Time Integration & UI Overhaul

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/hooks/useDashboardStats.tsx` | **Create** — centralized hook |
| `src/components/dashboard/MachineIssues.tsx` | **Create** — replaces donut chart |
| `src/pages/Index.tsx` | **Rewrite** — wire hook to components |
| `src/components/dashboard/KPICard.tsx` | **Edit** — add `loading` prop with skeleton |
| `src/components/dashboard/RevenueChart.tsx` | **Edit** — accept data via props |
| `src/components/dashboard/RecentVisits.tsx` | **Edit** — accept data via props |
| `src/components/dashboard/QuickActions.tsx` | **Edit** — rename button |
| `src/components/dashboard/MachineStatusChart.tsx` | **Delete** (no longer imported) |
| `src/components/dashboard/UpcomingRoutes.tsx` | **No changes** |

### 1. `useDashboardStats` Hook

Single hook exporting all dashboard data. Uses `date-fns` with a fixed UTC-5 offset helper for all date boundaries. All queries run in parallel via separate `useQuery` calls. Accepts a `issuesPeriod: "weekly" | "monthly"` parameter (state managed in Index).

**Date boundary helpers** (all UTC-5 aware):
- `getMonthStart(date)` / `getWeekStartMonday(date)` using `startOfMonth`, `startOfWeek({ weekStartsOn: 1 })` shifted by UTC-5.
- MTD comparison: current month 1st→today vs prev month 1st→min(today's day, last day of prev month).
- WTD comparison: this Monday→today vs last Monday→last Monday + same offset.

**Queries:**

- **Monthly Revenue**: Two date-filtered queries — `spot_visits.total_cash_collected` + `sales.total_amount` for current MTD and previous MTD. Returns `{ current, previous, pctChange }`.

- **Weekly Revenue**: Same dual-source sum for current WTD vs previous WTD.

- **Chart Data**: Fetch `spot_visits` and `sales` for current week (Mon-Sun), aggregate by day client-side into `{ name: "Mon", revenue: number }[]`.

- **Active Machines**: `machines` count where `status = 'deployed'`, plus total count.

- **Active Spots**: `spots` count where `status = 'active'`.

- **Recent Visits**: Latest 5 `spot_visits` joined with `spots(name, location:locations(name))` and `operator:user_profiles(first_names, last_names)`. Returns location, operator name, cash, visit_date, status.

- **Machine Issues**: Two-part query:
  1. All `maintenance_tickets` where `status != 'completed'` (always shown, pinned).
  2. Completed tickets filtered by `resolved_at` within the selected period (weekly/monthly).
  Merge and deduplicate, sort by created_at desc. Join with `location:locations(name)`, `machine:machines(serial_number)`.

### 2. KPI Cards

Add optional `loading?: boolean` prop to `KPICard`. When true, render `<Skeleton>` blocks instead of text.

Card mapping in Index:
- **Monthly Revenue**: `$XX,XXX` / `+X.X% vs last month` (positive/negative/neutral based on sign)
- **Weekly Revenue**: same pattern, WTD comparison
- **Active Machines**: deployed count / `{total} total in fleet`
- **Active Spots**: active count / `{total} locations` (query total spots too)

### 3. Revenue Chart

Accept `data: { name: string; revenue: number }[]` and `weekTotal: number` as props. Show skeleton when data is undefined. Remove hardcoded array.

### 4. Machine Issues Component

New `MachineIssues.tsx`:
- Card with header "Machine Issues" and a `Switch` toggle labeled "Weekly" / "Monthly"
- Toggle state lifted to Index, passed as callback
- Renders list of tickets: priority badge (color-coded), issue_type, location name, machine serial, time ago
- Unresolved tickets get a small "Open" badge pinned at top
- Completed tickets appear below under a subtle divider
- Empty state when no tickets

### 5. Recent Visits

Accept `visits` array and `isLoading` as props. Map to cards with: location (spot → location), operator name, `formatDistanceToNow(visit_date)`, `$total_cash_collected`, status badge. "View All" links to `/visits`. Show skeletons when loading.

### 6. Quick Actions

Change "Add Machine" button: icon from `Plus` to `Layers`, text to "Assemble Item", route to `/warehouse/assembly/new`.

### No Database Changes Required

All data comes from existing tables. No migrations needed.

