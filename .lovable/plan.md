

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
