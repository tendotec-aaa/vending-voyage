

## Predictive Demand Loading & Swap-Only Logic

### Overview

Four files need changes. No database migrations required -- all data already exists in `spot_visits` and `visit_line_items`.

### 1. `src/hooks/useRoutes.tsx` -- Add `demandMapQuery`

New query inside `useRouteDetail`, enabled when `slotsQuery.data` has items:

- Extract unique `spot_id` values from the slots data
- For each spot, fetch the last 2 `spot_visits` ordered by `visit_date DESC` (batch query using `.in("spot_id", spotIds).order("visit_date", { ascending: false })`)
- Since Supabase doesn't support per-group LIMIT, fetch all visits for those spots, then in JS keep only the 2 most recent per `spot_id`
- With those visit IDs, fetch `visit_line_items` where `action_type` is `refill` or `swap_in`, selecting `slot_id` and `quantity_added`
- Aggregate in JS: for each `slot_id`, compute `total quantity_added / number of visits` (i.e., average per visit across the last 2 visits)
- Return `Map<string, number>` (slot_id to avg demand)
- Expose `demandMapQuery` from the hook return object

### 2. `src/components/routes/PickList.tsx` -- Demand-based refill + swap-only fix

- Add `demandMap: Map<string, number>` prop
- In the refill branch (the `else`), replace the formula:
  ```
  // OLD: (capacity - current_stock) * multiplier
  // NEW:
  const historicalDemand = demandMap.get(slot.id);
  const needed = Math.ceil(
    (historicalDemand ?? Math.max(0, (slot.capacity || 150) - (slot.current_stock || 0))) * multiplier
  );
  ```
- The swap branch already correctly skips the refill `else`, so swapped slots won't generate ghost refills (confirmed by code review -- the `if/else` structure is correct)

### 3. `src/components/routes/RouteStopCard.tsx` -- Same formula for mobile/desktop summaries

- Add `demandMap: Map<string, number>` prop
- Update `slotSummaries` computation (line 50) to use the same historical demand formula instead of `capacity - current_stock`

### 4. `src/pages/RouteDetail.tsx` -- Wire demandMap + update Copy Summary

- Destructure `demandMapQuery` from `useRouteDetail(id)`
- Create `const demandMap = demandMapQuery.data || new Map<string, number>()`
- Pass `demandMap` to `<PickList>` and `<RouteStopCard>`
- Update `handleCopyRouteSummary` (line 114) to use the same historical demand formula in the refill calculation

### Constraints confirmed

All calculations are read-only aggregations. No writes to `machine_slots`, `inventory`, or `inventory_ledger` occur. This remains a planning-only tool.

