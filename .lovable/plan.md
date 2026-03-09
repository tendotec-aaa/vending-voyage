## ✅ COMPLETED: Bulletproof Append-Only Ledger Architecture

### What was implemented:

1. **DB Trigger `sync_inventory_from_ledger`** — Fires after every INSERT on `inventory_ledger`. Automatically recomputes `inventory.quantity_on_hand` via `SUM(quantity)` for the affected `(item_detail_id, warehouse_id)` pair. The `inventory` table is now a materialized cache of the ledger.

2. **Edge Function cleanup** (`submit-visit-report/index.ts`) — Removed `upsertInventory()` and `deductInventory()` helper functions. Only `appendLedger()` calls remain as the sole write path. The trigger handles all inventory sync.

3. **useReceiveStock.tsx cleanup** — Removed `upsertInventory` helper. Ledger inserts now drive inventory sync via trigger.

4. **ItemDetail.tsx — Fixed doubling bug** — Removed manual `inventory.update()` call from `handleReportVisualDiscrepancy`. Only the ledger insert remains; trigger does the rest.

5. **Admin "Reverse Entry" button** — Each ledger row (non-reversal) has an undo icon. On click, inserts a compensating `reversal` entry with `-originalQuantity`. Trigger auto-corrects inventory.

6. **Warehouse Sale feature** — New `WarehouseSaleDialog` component. Records wholesale sales as `warehouse_sale` movement type in ledger. Accessible from Stock Discrepancy section.

7. **`warehouse_sale` movement type** — Added to DB constraint and UI color mapping.

### Architecture now:
- **Single write path**: All inventory changes go through `inventory_ledger` INSERT
- **Trigger sync**: `trg_sync_inventory_after_ledger` auto-updates `inventory.quantity_on_hand`
- **Append-only**: No UPDATE/DELETE on ledger. Errors corrected via reversal entries
- **Audit trail**: Complete history of every stock movement with performer tracking

---

## ✅ COMPLETED: Route Audit & Refill Reconciliation with Under-fill Warnings

### What was implemented:

1. **Database Migration** — Added `route_id` (uuid FK→routes) to `spot_visits`, and `completed_at` (timestamptz) + `auto_completed` (boolean) to `routes`.

2. **Visit Submission Tagging** — `OperatorDashboard.tsx` now passes `route_id` as a URL param when navigating to `/visits/new`. `NewVisitReport.tsx` reads `route_id` from search params and includes it in the edge function payload. `submit-visit-report` edge function persists `route_id` on the `spot_visits` insert.

3. **Route Interface Update** — `useRoutes.tsx` Route interface now includes `completed_at` and `auto_completed` fields.

4. **Reconciliation Tab** — New `ReconciliationTab` component (`src/components/routes/ReconciliationTab.tsx`) added as a third tab in `RouteDetail.tsx`, visible only to admin/accountant roles.

### Reconciliation Tab Features:
- **Accuracy Score**: `(items where |variance|/suggested < 10%) / total_items × 100`
- **Status Badges**: Route status, completion time, "System Verified" badge for auto-completed routes
- **Audit Table per Location**: Item/Slot, System Suggested (velocity model), Actual Refill (visit_line_items), Variance with percentage
- **Red variance text**: When `|variance| / suggested > 20%`
- **Amber warning rows**: When `actual < suggested × 0.70` AND no operator notes — flags unexplained under-fills with ⚠️ tooltip
- **Operator Notes**: Displayed below each location's table
- **Fallback matching**: For pre-migration routes without `route_id`, matches visits by spot proximity + date ±1 day

### Architecture:
- **Forward-looking**: New visits from operator dashboard are tagged with `route_id`
- **Backward-compatible**: Older routes use date/spot fallback matching
- **Role-gated**: Reconciliation tab only visible to admin and accountant roles
