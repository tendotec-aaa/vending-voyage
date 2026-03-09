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

## ✅ COMPLETED: Fixed Overhead Generation & Historical Rent Ledger

### What was implemented:

1. **Database Migration** — Added `rent` and `depreciation` values to `expense_category` enum. Created `overhead_postings` tracking table with unique constraints on `(year_month, location_id, posting_type)` and `(year_month, setup_id, posting_type)` to prevent duplicate generation.

2. **`useProfitability.tsx` — Overhead Generation** — Added `generateOverhead` mutation that snapshots current `rent_amount` from all locations and machine depreciation from all active setups as permanent `operating_expenses` rows. Added `isOverheadPosted` and `overheadCount` status tracking. Added `rent` and `depreciation` to `ExpenseCategory` type, labels, and colors.

3. **`Profitability.tsx` — Generate Overhead Button** — Admin-only "Generate Monthly Overhead" button with AlertDialog confirmation. Shows "Overhead Posted (N entries)" badge when already generated. Button disabled when overhead already exists.

4. **`useSpotHealth.tsx` — Posted vs Projected Logic** — Fetches `overhead_postings` joined with `operating_expenses` for the selected month. If posted rent exists for a location, splits it equally among active spots. If posted depreciation exists for a setup, uses the snapshotted amount. Falls back to live calculation with `isProjectedRent`/`isProjectedDepreciation` flags.

5. **`SpotHealth.tsx` — Projected Indicator** — Shows a "Projected" badge with tooltip when any rent/depreciation values are estimated. Individual cells show a `~` marker next to projected values.

### Architecture:
- **Snapshot model**: "Generate Monthly Overhead" creates permanent expense rows — changing `rent_amount` later won't affect past months
- **Location-level rent**: Rent comes from `locations.rent_amount`, split equally among active spots at that location
- **Bottom-up depreciation**: Summed from `item_details.monthly_depreciation` for each machine in a setup
- **Dual-source display**: Spot Health prefers posted actuals, falls back to projected from master data
- **Duplicate prevention**: `overhead_postings` unique constraints prevent re-generation
