

## Item Performance & Analytics Dashboard

### Overview
New page at `/insights/items` with a performance leaderboard for sellable items, featuring velocity, ROI, stock cover metrics, "Top Notch" badges, and drill-down per item.

### Data Sources
- **Units Sold**: `visit_line_items` (units_sold > 0) joined to `spot_visits` (month filter) — grouped by `product_id`
- **Machine Count per Item**: `visit_line_items` joined to `spot_visits` — COUNT DISTINCT `machine_id` per `product_id`
- **WAC**: `purchase_items` — same weighted average cost logic as profitability hook
- **Sale Price**: `machine_slots.coin_acceptor` — average across slots where `current_product_id` = item
- **Current Stock**: `inventory` table — SUM `quantity_on_hand` per `item_detail_id`
- **3-Month Trend**: Fetch visit_line_items for current month and 2 prior months
- **Item Catalog**: `item_details` joined to `item_types` where `is_sellable = true`

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useItemAnalytics.tsx` | Data hook: fetches all data for selected month, computes velocity/ROI/stock cover/top notch |
| `src/pages/ItemAnalytics.tsx` | Main page with DataTable + drill-down Sheet |
| `src/components/insights/ItemDrillDown.tsx` | Sheet component: machine ranking table + 3-month sparkline |

### Computed Metrics (all client-side)

- **Velocity** = Total Units Sold / Distinct Machines / Days in Month
- **ROI** = ((Avg Sale Price - WAC) / WAC) * 100
- **Gross Profit** = Total Sold * (Avg Sale Price - WAC)
- **Stock Cover** = Current Stock on Hand / (Velocity * Distinct Machines) — days remaining
- **Top Notch** = ROI > 300% AND velocity >= 80th percentile of all items

### Hook: `useItemAnalytics(year, month)`

Fetches in parallel:
1. `item_details` + `item_types` (filter `is_sellable`)
2. `spot_visits` for selected month (get IDs + date range)
3. `visit_line_items` with `units_sold > 0` — filter by visit IDs, group by product_id: total units, distinct machines
4. `purchase_items` for WAC map
5. `machine_slots` for avg coin_acceptor per product
6. `inventory` for current stock per item
7. For drill-down: `visit_line_items` for 3 months with machine_id + spot_visit references for machine ranking

Returns array of item performance rows + helper to get drill-down data.

### Page Layout (`ItemAnalytics.tsx`)

- Month/year picker (same pattern as Profitability)
- DataTable with sortable columns: Item Name/SKU, Units Sold, Velocity, ROI%, Gross Profit, Stock Cover
- Stock Cover cell: yellow bg if < 15 days, red if < 5 days
- Gold star badge for "Top Notch" items
- Default sort: velocity descending
- Row click opens `ItemDrillDown` Sheet

### Drill-Down Sheet (`ItemDrillDown.tsx`)

- **Machine Ranking**: Table showing machine serial + location, units sold, velocity — sorted by velocity desc
- **3-Month Sparkline**: Recharts `LineChart` (tiny, no axes) showing units sold for current and 2 prior months

### Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/insights/items` route with `PermissionGuard` (`view_analytics`) |
| `src/components/layout/AppSidebar.tsx` | Add "Item Analytics" to `insightsItems` array |

### No Database Changes Required
All data already exists in current tables. This is purely a frontend analytics view using existing data.

