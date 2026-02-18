
## Fix: Inventory Unique Constraint — Split Warehouse Receiving

### Problem
The `inventory` table has a database-level UNIQUE constraint on `(item_detail_id)` alone, named `warehouse_inventory_item_definition_id_key`. This means only one inventory row per product can ever exist across **all** warehouses.

When receiving stock split across two warehouses:
1. Warehouse A row inserts successfully.
2. Warehouse B tries to insert a row for the same product → constraint violation → error.

The application logic in `useReceiveStock.tsx` was already correctly written (it checks for an existing row by both `item_detail_id` AND `warehouse_id` before inserting), but the database constraint overrides that and rejects the second insert.

### Solution
Fix the unique constraint at the database level only. No frontend code changes are needed — the existing `upsertInventory` logic is already correct and will work properly once the constraint is fixed.

**Minimal database migration:**
1. Drop the incorrectly-scoped unique constraint: `warehouse_inventory_item_definition_id_key`
2. Add the correctly-scoped unique constraint on `(item_detail_id, warehouse_id)` — one row per product per warehouse

This preserves the intent of preventing duplicate rows (good), but scopes it correctly so that the same product can exist in multiple warehouses (required for split allocation).

### Audit Trail
The `receiving_allocations` table is completely unaffected — it already records every split allocation with `purchase_id`, `purchase_item_id`, `warehouse_id`, and `quantity`. The full audit trail of where stock was received from is preserved.

### What Changes
- **Database only**: One migration that drops and recreates the unique index
- **No frontend code changes**: The `upsertInventory` function logic is already correct
- **No data loss**: Existing inventory rows are untouched; the constraint change only widens what is allowed

### Migration SQL
```sql
-- Drop the over-restrictive constraint (only on item_detail_id)
ALTER TABLE public.inventory 
  DROP CONSTRAINT IF EXISTS warehouse_inventory_item_definition_id_key;

-- Add the correct composite unique constraint (item per warehouse)
ALTER TABLE public.inventory 
  ADD CONSTRAINT inventory_item_warehouse_unique 
  UNIQUE (item_detail_id, warehouse_id);
```

This is the smallest possible change that resolves the error without touching any application logic, data, or audit records.
