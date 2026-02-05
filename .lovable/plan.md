

# Plan: Separate Inventory Page + New Spots Analytics Dashboard

## Summary

This plan involves two main changes:
1. **Update the current Inventory page** at `/inventory` to connect to real database data showing stock across warehouses and machines
2. **Create a new Spots Analytics page** at `/spots` with a comprehensive dashboard featuring Leaderboard, Trends, and Alerts tabs
3. **Update sidebar navigation** to place Inventory above Warehouse in the Assets & Inventory section

---

## Current State Analysis

| Route | Current State |
|-------|---------------|
| `/inventory` | Displays mock product inventory table with hardcoded data |
| `/warehouse` | Shows actual warehouse inventory from database with item cards |
| Sidebar | "Spots" under Locations section links to `/inventory` (confusing) |

### Data Available for Analytics

| Data Source | Metrics Available |
|-------------|-------------------|
| `spots` table | Spot name, status, creation date |
| `locations` table | Location name, rent_amount, commission_percentage |
| `spot_visits` table | Total cash collected, visit dates per spot |
| `machine_slots` table | current_stock, capacity per slot |
| `maintenance_tickets` table | Open tickets linked to spots |
| `setups` / `machines` | Setup and machine assignments per spot |

---

## Changes Overview

### 1. Navigation Restructure

**Sidebar Updates:**

Assets & Inventory section (new order):
- Inventory -> `/inventory` (existing, updated)
- Warehouse -> `/warehouse`
- Machines -> `/machines`
- Setups -> `/setups`

Locations section (updated):
- Locations -> `/locations`
- Spots -> `/spots` (new analytics page)

### 2. Updated Inventory Page (`/inventory`)

Convert from mock data to real database queries showing consolidated stock:

**Features:**
- Summary cards: Total SKUs, Warehouse Stock, In Machines, Low Stock Items
- Search and filter by name and category
- Table showing: SKU, Product Name, Category, Warehouse qty, In Machines qty, Stock Level progress bar, Cost, Price
- Real data from `inventory` table joined with `item_details`, `machine_slots`

### 3. New Spots Analytics Page (`/spots`)

Create a comprehensive analytics dashboard with three tabs:

**Leaderboard Tab:**
- Top 3 performer cards with medal badges (gold/silver/bronze)
- Sortable table with columns: Rank, Spot Name, Location, Total Sales, Total Rent, Net Profit, ROI %, Stock Level, Trend Arrow
- Color-coded rows: subtle green tint for profitable, subtle red tint for loss

**Trends Tab:**
- Line charts showing sales/profit over time using Recharts (already installed)
- Comparison selector to compare 2-3 spots against each other
- Time range selector (7d, 30d, 90d, 1y)

**Alerts Tab:**
- Low stock spots: under 25% capacity
- Unprofitable spots: negative ROI
- Spots needing maintenance: open ticket count > 0
- Each alert card links to the relevant detail page

**Quick Features:**
- Quick filters: By location, profitability status, stock level
- Export to CSV button for reporting
- Click-through to spot details (navigates to Locations page)

---

## Technical Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Spots.tsx` | Main Spots analytics dashboard with tabs |
| `src/components/spots/SpotLeaderboard.tsx` | Leaderboard tab with top performers and sortable table |
| `src/components/spots/SpotTrends.tsx` | Trends tab with charts and comparison selector |
| `src/components/spots/SpotAlerts.tsx` | Alerts tab showing actionable items |
| `src/components/spots/TopPerformerCard.tsx` | Card component for top 3 spots with medal badges |
| `src/hooks/useSpotAnalytics.tsx` | Hook to fetch and calculate spot performance metrics |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/spots` route |
| `src/components/layout/AppSidebar.tsx` | Update navigation order and Spots link |
| `src/pages/Inventory.tsx` | Convert to real data from inventory table |

### New Hook: useSpotAnalytics

This hook will aggregate data from multiple tables:

```text
Query Flow:
1. Fetch all spots with their locations (rent data)
2. Fetch spot_visits to calculate total sales per spot
3. Fetch machine_slots through setups to calculate stock capacity
4. Fetch maintenance_tickets for open issues per spot
5. Calculate derived metrics per spot
```

**Calculated Metrics:**

| Metric | Calculation |
|--------|-------------|
| Total Sales | SUM(spot_visits.total_cash_collected) |
| Total Rent | location.rent_amount (monthly) |
| Net Profit | Total Sales - Total Rent |
| ROI % | (Net Profit / Total Rent) * 100 |
| Stock Level % | (current_stock / capacity) * 100 across all slots |
| Trend | Compare current 30-day sales to previous 30-day |
| Days Active | DATEDIFF(now, spot.created_at) |

### Component Structure

```text
Spots.tsx
├── Header with title, export button
├── Quick Filters row
│   ├── Location dropdown
│   ├── Profitability filter (All/Profitable/Loss)
│   └── Stock level filter (All/Low/Healthy)
└── Tabs
    ├── Leaderboard
    │   ├── TopPerformerCard x3 (with medal badges)
    │   └── Sortable Table
    ├── Trends
    │   ├── Time Range Selector (pills)
    │   ├── Spot Comparison Selector (multi-select up to 3)
    │   └── LineChart (Recharts)
    └── Alerts
        ├── Low Stock Section (cards)
        ├── Unprofitable Section (cards)
        └── Maintenance Section (cards)
```

---

## UI/UX Details

### Leaderboard Tab Design
- Top 3 performer cards displayed horizontally with gradient backgrounds
- Medal emojis for ranking: first place gold, second place silver, third place bronze
- Key metrics shown: Total Sales, Net Profit, ROI %
- Sortable table with click-to-sort column headers
- Row backgrounds: subtle green tint (`bg-green-500/10`) for profitable, subtle red tint (`bg-red-500/10`) for loss
- Trend arrows: green up arrow for positive, red down arrow for negative, gray horizontal for flat

### Trends Tab Design
- Multi-select dropdown to choose 2-3 spots for comparison
- Time range pills: 7d | 30d | 90d | 1y
- Recharts LineChart with multiple colored series (one per spot)
- Legend showing spot names with color indicators
- Tooltip showing values on hover

### Alerts Tab Design
- Three collapsible sections with badge counts in headers
- Card-based alerts showing:
  - Spot name and location
  - Specific issue (e.g., "15% stock remaining" or "-$45 ROI this month")
  - Quick action button linking to relevant page

### Inventory Page Updates
- Keep existing table layout
- Connect to real data from `inventory` table
- Show warehouse quantities alongside machine quantities
- Calculate totals dynamically

---

## Route and Navigation Updates

### App.tsx Route Addition
```text
/spots -> <Spots />
```

### AppSidebar.tsx Changes

Assets & Inventory section items:
1. Inventory -> `/inventory` (moved from Locations section)
2. Warehouse -> `/warehouse`
3. Machines -> `/machines`
4. Setups -> `/setups`

Locations section items:
1. Locations -> `/locations`
2. Spots -> `/spots` (updated from `/inventory`)

---

## Database Queries

### Spot Analytics Query
```sql
SELECT 
  s.id, s.name as spot_name, s.created_at, s.status,
  l.id as location_id, l.name as location_name, 
  l.rent_amount, l.commission_percentage,
  COALESCE(SUM(sv.total_cash_collected), 0) as total_sales,
  COUNT(DISTINCT sv.id) as visit_count
FROM spots s
LEFT JOIN locations l ON s.location_id = l.id
LEFT JOIN spot_visits sv ON sv.spot_id = s.id
GROUP BY s.id, l.id
```

### Stock Capacity Query
```sql
SELECT 
  s.id as spot_id,
  COALESCE(SUM(ms.current_stock), 0) as current_stock,
  COALESCE(SUM(ms.capacity), 0) as total_capacity
FROM spots s
LEFT JOIN setups set ON set.spot_id = s.id
LEFT JOIN machines m ON m.setup_id = set.id
LEFT JOIN machine_slots ms ON ms.machine_id = m.id
GROUP BY s.id
```

### Open Tickets Query
```sql
SELECT spot_id, COUNT(*) as open_tickets
FROM maintenance_tickets
WHERE status != 'completed' AND spot_id IS NOT NULL
GROUP BY spot_id
```

---

## Implementation Order

1. Create navigation updates in AppSidebar.tsx
2. Add /spots route to App.tsx
3. Create useSpotAnalytics hook with all data fetching
4. Create TopPerformerCard component
5. Create SpotLeaderboard component
6. Create SpotTrends component
7. Create SpotAlerts component
8. Create main Spots.tsx page with tabs
9. Update Inventory.tsx to use real database data
10. Test end-to-end functionality

