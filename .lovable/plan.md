

## Advanced Route Planning with Predictive Loading & Swaps

This is a large feature spanning 6 new files and 2 modifications. The `routes` and `route_stops` tables already exist with the required columns (`demand_multiplier`, `planned_actions` JSONB, `sort_order`, `arrival_status`).

### Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useRoutes.tsx` | CRUD hook for routes + route_stops; queries for location/spot/machine/slot data needed by the pick list |
| `src/pages/Routes.tsx` | Route list page with status badges, date, driver name |
| `src/pages/RouteDetail.tsx` | Route builder + pick list view (single page with tabs) |
| `src/components/routes/RouteStopCard.tsx` | Card per location stop: demand multiplier dropdown, planned swaps list, open maintenance tickets |
| `src/components/routes/PickList.tsx` | Aggregated loading manifesto: groups items by product, shows refill + swap quantities, maintenance alerts |
| `src/components/routes/PlannedSwapDialog.tsx` | Dialog to select a machine slot and pick a new product for a planned swap |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/routes`, `/routes/:id` routes |
| `src/components/layout/AppSidebar.tsx` | Add "Routes" link under Operations group with `Route` icon |

### Data Flow & Queries

**useRoutes hook:**
- `routesQuery`: Fetch all routes with driver profile join
- `routeDetailQuery(routeId)`: Fetch single route + its `route_stops` with location join, ordered by `sort_order`
- `slotsForRoute(locationIds)`: Fetch all machine_slots for machines deployed at spots belonging to the selected locations (joins: `machine_slots -> machines -> setups -> spots -> locations`). Returns slot ID, current_product_id, current_stock, capacity, machine serial, slot number
- `maintenanceForRoute(locationIds)`: Fetch open `maintenance_tickets` (status != 'completed') for the selected locations
- `createRoute`, `updateRoute`, `deleteRoute` mutations
- `addStop`, `removeStop`, `updateStop` mutations (update `demand_multiplier`, `planned_actions` JSONB)

**planned_actions JSONB structure:**
```json
[
  {
    "type": "swap",
    "slotId": "uuid",
    "machineSerial": "SN-001",
    "slotNumber": 1,
    "oldProductId": "uuid",
    "oldProductName": "SLIME 55MM",
    "newProductId": "uuid", 
    "newProductName": "POKEMON 55MM",
    "capacity": 150
  }
]
```

### Pick List Calculation (client-side, read-only)

For each slot across all stops:
1. Check if slot has a planned swap in that stop's `planned_actions`
2. **If swap**: Add `capacity` units of `newProductId` to the pick list (ignore old product refill)
3. **If no swap**: Add `Math.ceil((capacity - current_stock) * (1 + demand_multiplier))` units of `current_product_id`
4. Aggregate by product across all stops, show totals

### Route Builder UI (RouteDetail page)

**Header**: Route name, date picker, driver dropdown (from `user_profiles`), status badge

**Tabs:**
- **Stops** tab: Sortable list of `RouteStopCard` components. Each card shows:
  - Location name + address
  - Demand multiplier dropdown (0%, 10%, 25%, 50%)
  - Spots/machines summary (count of slots needing refill)
  - "Plan Swap" button opening `PlannedSwapDialog`
  - List of planned swaps with remove button
  - Open maintenance tickets for that location (from `maintenance_tickets`)
- **Pick List** tab: `PickList` component showing aggregated product quantities, grouped by product name, with total units needed

**Add Stop**: Location combobox at the bottom, filtered to exclude already-added locations

### Mobile Driver View

When viewing a route on mobile, the Stops tab renders as a clean vertical checklist:
- Location name + address
- Per-slot action summary: "Refill: POKEMON 55MM x 45" or "Swap: SLIME -> POKEMON (150 units)"
- Maintenance alerts in orange badges
- No editing controls on mobile (read-only)

### Sidebar Addition

Add `{ title: "Routes", icon: Route, url: "/routes" }` to the `operationsItems` array in `AppSidebar.tsx`, using the `Route` icon from lucide-react.

### Constraints

- **No inventory mutations**: All data is read-only. No `inventory_ledger` inserts, no `machine_slots` updates
- **Uses existing tables**: `routes` and `route_stops` with their existing columns
- **The types.ts file won't have these tables** since they're not in the generated types yet. All Supabase queries will use `.from("routes")` with manual TypeScript interfaces in the hook

