

## Plan: Add "Copy Route Summary" with Spot Names

### Current State — Everything Exists Except Copy Summary
- **Routes list page** (`src/pages/Routes.tsx`) — working
- **Route detail/builder** (`src/pages/RouteDetail.tsx`) — header with name/date/driver, stop cards, add-location combobox, tabs for Stops and Pick List
- **Stop cards** (`RouteStopCard.tsx`) — demand multiplier, planned swaps, maintenance badges, mobile driver view
- **Pick list** (`PickList.tsx`) — aggregated loading manifesto with refill/swap logic
- **Planned swap dialog** (`PlannedSwapDialog.tsx`) — slot selection for swaps
- **Sidebar + App.tsx routing** — `/routes` and `/routes/:id` already wired

### What Needs to Be Built

**File 1: `src/hooks/useRoutes.tsx`**

Add `spot_name` and `spot_id` to the `SlotData` interface. In the existing `slotsQuery`, the code already fetches spots with `select("id, location_id")` — change to `select("id, name, location_id")`. Build a `spotNameMap` (id → name) and include `spot_name` and `spot_id` in each returned slot object.

Add `spot_id` to `MaintenanceTicket` interface and its query select.

**File 2: `src/pages/RouteDetail.tsx`**

Add a `handleCopyRouteSummary` function and a "Copy Summary" button in the header row.

The function builds this text:

```text
📋 ROUTE: {name}
📅 {formatted date}
🚗 Driver: {driver name or "Unassigned"}

--- STOPS ---

📍 {Location Name}
  [{spot_name or "Machine at Location"}] ➔ REFILL: {Product} ({qty} units)
  [{spot_name or "Machine at Location"}] ➔ SWAP: {Old} TO {New} ({capacity} units)
  [{spot_name or "Machine at Location"}] ➔ REPAIR: {issue_type} — {description}

📦 LOADING MANIFEST:
• {PRODUCT NAME ALL CAPS} — {total} (Refill: {x}, Swap: {y})
🔢 Total Units to Load: {grand total}

🔧 MAINTENANCE ({count}):
• {issue} — {location} ({priority})
```

Logic details:
- For each stop, get `locationSlots` grouped by `spot_name`. Fallback: `"Machine at {location.name}"`
- Refills: `Math.ceil((capacity - current_stock) * multiplier)`, skip if <= 0
- Swaps: from `planned_actions`, use full `capacity`
- Pick list aggregation: same Map logic as `PickList.tsx`, product names `.toUpperCase()`
- Uses `navigator.clipboard.writeText()` + `toast.success("Dispatch summary copied to clipboard!")`

New imports: `Copy` from lucide-react, `toast` from sonner.

Button placement: in the header row next to route name/badge, `variant="outline"` `size="sm"`.

### No database changes. No new files. No ledger writes.

