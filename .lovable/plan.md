

## Sales Velocity & Time-Elapsed Refill Model

### Core Problem
The current `demandMapQuery` returns **avg quantity_added per visit** (e.g., 50 units). But it ignores *when* those visits happened. If visits were 7 days apart, daily velocity is ~7 units/day. If the next route is 14 days later, you need ~98 units -- not 50. Time is the missing variable.

### New Formula
```
Daily Velocity = Total quantity_added across last 2 visits / Total days spanning those visits
Predicted Need = Daily Velocity × Days Since Last Visit × (1 + Buffer Multiplier offset)
```

Fallbacks:
- 1 visit only: `quantity_added / days_since_last_visit` (from that visit record)
- 0 visits: empty space = `capacity - current_stock` (top-off rule)

### Changes

#### 1. `src/hooks/useRoutes.tsx` -- Replace `demandMapQuery` with velocity model

The query will return `Map<string, { dailyVelocity: number; daysSinceLastVisit: number }>` instead of `Map<string, number>`.

**Data fetched:**
- Last 2 `spot_visits` per spot (already done), but now also capture `visit_date`
- `visit_line_items` with `quantity_added` (already done)
- Compute per-slot: `totalAdded / daysBetweenFirstAndLastVisit` = daily velocity
- Compute per-spot: `daysElapsed = today - mostRecentVisitDate`

**For single-visit spots:** velocity = `totalAdded / days_since_last_visit` from that visit (already stored). If that's null/0, default to 2 units/day.

**Export a new interface:**
```typescript
export interface VelocityData {
  dailyVelocity: number;
  daysSinceLastVisit: number;
}
```

Return type becomes `Map<string, VelocityData>`.

#### 2. Unified calculation helper (in useRoutes.tsx, exported)

```typescript
export function computeSlotRefill(
  slot: SlotData,
  velocityMap: Map<string, VelocityData>,
  multiplier: number
): number {
  const v = velocityMap.get(slot.id);
  if (v && v.dailyVelocity > 0) {
    const baseRefill = v.dailyVelocity * v.daysSinceLastVisit;
    return Math.ceil(baseRefill * multiplier);
  }
  // Fallback: top-off empty space
  const emptySpace = Math.max(0, (slot.capacity || 150) - (slot.current_stock || 0));
  return Math.ceil(emptySpace * multiplier);
}
```

#### 3. `src/components/routes/PickList.tsx`

- Change prop from `demandMap: Map<string, number>` to `velocityMap: Map<string, VelocityData>`
- Replace inline demand formula with `computeSlotRefill(slot, velocityMap, multiplier)`
- Swap branch unchanged (full capacity of new product)

#### 4. `src/components/routes/RouteStopCard.tsx`

- Same prop change: `velocityMap` instead of `demandMap`
- `slotSummaries` uses `computeSlotRefill(slot, velocityMap, multiplier)`

#### 5. `src/pages/RouteDetail.tsx`

- Rename `demandMap` to `velocityMap` throughout
- `handleCopyRouteSummary` uses `computeSlotRefill` for refill lines
- Pass `velocityMap` to `PickList` and `RouteStopCard`

### Velocity Calculation Detail (in the query)

```text
Per spot: keep last 2 visits sorted by visit_date DESC → [Visit A (newest), Visit B (oldest)]

daysBetweenVisits = Visit A date - Visit B date (in days, min 1)
daysSinceLastVisit = today - Visit A date (in days, min 1)

Per slot: totalAdded from line items across both visits
dailyVelocity = totalAdded / daysBetweenVisits

Single visit only:
  dailyVelocity = totalAdded / (visit.days_since_last_visit || 14)
  daysSinceLastVisit = today - visit date
```

### No database changes required
All data (`spot_visits.visit_date`, `visit_line_items.quantity_added`, `spot_visits.days_since_last_visit`) already exists.

