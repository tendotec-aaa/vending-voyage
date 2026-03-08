

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

## ✅ COMPLETED: Category-Based SKU Generation with Uniqueness Guardrails

### Format
`{CategoryInitials}{SubcategoryInitials}-{6-digit-number}`
- Category "Maquinas Vending", Subcategory "Juguetes Capsulas" → `MVJC-482910`
- No category/subcategory → `XX-482910`

### What was implemented:

1. **`src/lib/skuGenerator.ts`** — Rewritten with:
   - `generateCode(name)` — extracts first letter of each word, max 2 chars
   - `generateSkuCode(categoryName?, subcategoryName?)` — combines initials + random 6-digit number
   - `insertItemDetailWithRetrySku(insertData, categoryName?, subcategoryName?)` — wraps INSERT with retry loop (max 3 attempts) on unique constraint violation (PostgreSQL error 23505)

2. **`src/hooks/usePurchases.tsx`** — Uses `insertItemDetailWithRetrySku` with category/subcategory name lookup

3. **`src/hooks/useWarehouseInventory.tsx`** — Uses `insertItemDetailWithRetrySku`, accepts `categoryName`/`subcategoryName` params

4. **`src/hooks/useAssemblies.tsx`** — Uses `insertItemDetailWithRetrySku` with category/subcategory name lookup

5. **`src/pages/NewPurchase.tsx`** — Uses `generateSkuCode()` for preview/placeholder SKUs

### Uniqueness guarantees:
- **DB constraint** `item_definitions_sku_key` (UNIQUE on `sku`) prevents duplicates
- **Retry loop** regenerates SKU on collision, up to 3 attempts
- **Single helper function** used by all item creation flows
