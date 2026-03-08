

## Plan: Enhanced Item Analytics & Sell-Through Velocity

### Problem
The current Financial Performance card shows Gross Profit and Margin, which are almost always negative for new items since revenue hasn't caught up to inventory investment. These metrics aren't actionable for day-to-day operations.

### Proposed Changes (1 file: `src/pages/ItemDetail.tsx`)

#### Replace Financial Performance Card with "Item Intelligence" Card

Keep **Total Received**, **Inventory Value**, and **Revenue** (these are useful context). Replace **Gross Profit** and **Margin** with more actionable metrics:

- **Avg Unit Cost** — weighted average cost per unit (already computed as `weightedAvgCost`). Tells the operator what each unit costs them.
- **Cost Recovery %** — `(totalRevenue / totalInventoryCost) * 100`. Shows progress toward breaking even without the discouraging negative number. At 100% you've recovered your investment; above 100% you're profitable. More motivating than a negative gross profit.

#### Add Merchandise-Only "Sell-Through Velocity" Section

For `item.type === "merchandise"` only, add a new card below the financial card that shows:

1. **Sell Rate** — computed from `salesData` (visit_line_items) and `logisticsHistory` (which has visit dates):
   - Find the date range between the first and last visit for this product
   - `totalUnitsSold / daysInRange` = daily rate
   - Display as **daily**, **weekly** (x7), and **monthly** (x30) rates

2. **Stock Runway** — `totalStock / dailySellRate` = estimated days until stockout
   - Color-coded: green (>30 days), yellow (15-30), red (<15), gray if no sales data
   - Shows approximate depletion date

3. **Turnover Rate** — `totalUnitsSold / averageStock` — how many times inventory has been "turned over"

#### Data Sources (already fetched, no new queries needed)
- `salesData` — has `units_sold` per visit line item
- `logisticsHistory` — has visit dates via `spot_visit.visit_date`
- `totalStock`, `totalWarehouse`, `totalMachine` — current stock levels
- `totalUnitsSold`, `totalRevenue`, `totalInventoryCost` — already computed

#### Implementation Details
- Use the first and last visit dates from `logisticsHistory` to calculate the active selling period
- If fewer than 7 days of sales history, show "Insufficient data" instead of extrapolating
- The velocity card uses a 3-column grid layout matching the existing design
- No new queries, no database changes — purely computed from existing data

