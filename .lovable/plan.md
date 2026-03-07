

## Plan: Bulletproof Append-Only Ledger Architecture

The user has outlined a comprehensive architectural vision. This plan implements the key pillars: append-only ledger as single source of truth, a database trigger to sync `inventory.quantity_on_hand` from ledger SUM, a "Reverse Entry" feature for admin error correction, and a `warehouse_sale` movement type for wholesale bodega sales.

### Phase 1: Database — Trigger-Based Inventory Sync

**New Migration**: Create a trigger that fires after every `INSERT` on `inventory_ledger` and automatically recomputes `inventory.quantity_on_hand` from `SUM(quantity)` for the affected `(item_detail_id, warehouse_id)` pair.

```sql
-- Add warehouse_sale to movement_type check
ALTER TABLE public.inventory_ledger DROP CONSTRAINT IF EXISTS inventory_ledger_movement_type_check;
ALTER TABLE public.inventory_ledger ADD CONSTRAINT inventory_ledger_movement_type_check 
CHECK (movement_type = ANY (ARRAY[
  'receive','refill','removal','sale','swap_in','swap_out',
  'reversal','adjustment','transfer','initial',
  'assembly_consumption','assembly_production','warehouse_sale'
]));

-- Trigger function: recompute quantity_on_hand from ledger SUM
CREATE OR REPLACE FUNCTION public.sync_inventory_from_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only sync warehouse-level entries (slot entries don't affect warehouse inventory)
  IF NEW.warehouse_id IS NOT NULL THEN
    -- Upsert inventory row with SUM of all ledger entries for this item+warehouse
    INSERT INTO public.inventory (item_detail_id, warehouse_id, quantity_on_hand, last_updated)
    VALUES (
      NEW.item_detail_id,
      NEW.warehouse_id,
      (SELECT COALESCE(SUM(quantity), 0) FROM public.inventory_ledger
       WHERE item_detail_id = NEW.item_detail_id AND warehouse_id = NEW.warehouse_id),
      now()
    )
    ON CONFLICT (item_detail_id, warehouse_id)
    DO UPDATE SET
      quantity_on_hand = (SELECT COALESCE(SUM(quantity), 0) FROM public.inventory_ledger
                          WHERE item_detail_id = NEW.item_detail_id AND warehouse_id = NEW.warehouse_id),
      last_updated = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_inventory_after_ledger
AFTER INSERT ON public.inventory_ledger
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_from_ledger();
```

This eliminates all manual `upsertInventory`/`deductInventory` calls as the source of drift. The `inventory` table becomes a materialized cache of the ledger.

### Phase 2: Edge Function — Remove Manual Inventory Updates

**File**: `supabase/functions/submit-visit-report/index.ts`

- Remove all calls to `upsertInventory()` and `deductInventory()` helper functions. The trigger now handles `inventory.quantity_on_hand` automatically.
- Keep `appendLedger()` calls as-is — they are the sole write path.
- Remove the `upsertInventory` and `deductInventory` helper functions entirely.
- Update `running_balance` calculation in `appendLedger` calls: instead of manually computing, use `getRunningBalance()` + delta consistently (this is already mostly done).

### Phase 3: Edge Function — Remove Manual Inventory Updates from Receive Stock

**File**: `src/hooks/useReceiveStock.tsx`

- Remove the `upsertInventory` helper function and all direct `inventory` table updates.
- Keep only the `inventory_ledger` inserts (the trigger handles the rest).
- The `receiving_allocations` inserts stay as-is for audit purposes.

### Phase 4: ItemDetail — Remove Direct Inventory Updates from Visual Discrepancy

**File**: `src/pages/ItemDetail.tsx` (lines 537-544)

- Remove step 4 (`supabase.from("inventory").update(...)`) from `handleReportVisualDiscrepancy`. The ledger insert at step 3 will trigger the DB function to sync inventory automatically.
- This eliminates the doubling bug entirely — only one write path exists.

### Phase 5: Admin "Reverse Entry" Button on Ledger

**File**: `src/pages/ItemDetail.tsx`

- Add a small "Reverse" icon button next to each ledger entry (admin-only).
- On click, show a confirmation dialog: "This will create a compensating entry of {-quantity}. Continue?"
- On confirm: insert a new `inventory_ledger` row with `movement_type: "reversal"`, `quantity: -originalEntry.quantity`, `reference_id: originalEntry.id`, `reference_type: "reversal"`, and `notes: "Reversal of [original notes]"`.
- The `running_balance` is computed from `getRunningBalance` (latest entry) + reversal quantity.
- The trigger automatically corrects `inventory.quantity_on_hand`.

### Phase 6: Wholesale / Warehouse Sale Feature

**File**: New component `src/components/inventory/WarehouseSaleDialog.tsx`

- Dialog with fields: Item (pre-selected from ItemDetail), Warehouse (dropdown), Quantity, Customer/Note, Date.
- On submit: insert `inventory_ledger` row with `movement_type: "warehouse_sale"`, `quantity: -saleQty`, `reference_type: "manual"`.
- Trigger handles inventory sync.

**File**: `src/pages/ItemDetail.tsx`

- Add "Warehouse Sale" button next to "Report Visual Discrepancy" in the stock discrepancy section.
- Add `warehouse_sale` to `movementColors` styling.

### Phase 7: Update Discrepancy Formula

**File**: `src/pages/ItemDetail.tsx` (lines 847-851)

Update `expectedStock` to also account for:
- Assembly production: query `assemblies` where `output_item_detail_id = id` and `status = 'completed'` → sum `output_quantity`
- Assembly consumption: query `assembly_components` where `item_detail_id = id` → sum `total_quantity`  
- Ledger adjustments: sum all `inventory_ledger` entries where `movement_type = 'adjustment'` for this item
- Warehouse sales: sum all `inventory_ledger` entries where `movement_type = 'warehouse_sale'`

New formula:
```
expectedStock = totalReceived + totalAssemblyProduced - totalAssemblyConsumed 
                + totalAdjustments - totalWarehouseSales
                - totalUnitsSold - totalFalseCoins + totalJams
```

Or simpler: just use `SUM(quantity)` from all warehouse ledger entries as the expected stock, since the ledger IS the source of truth. This would make the discrepancy section compare `inventory.quantity_on_hand` (trigger-computed) against the physical count the user provides, rather than trying to derive expected from partial data.

### Files to Modify

1. **New migration** — Trigger `sync_inventory_from_ledger`, add `warehouse_sale` movement type
2. `supabase/functions/submit-visit-report/index.ts` — Remove `upsertInventory`/`deductInventory` calls (keep ledger inserts)
3. `src/hooks/useReceiveStock.tsx` — Remove manual inventory updates (keep ledger inserts)
4. `src/pages/ItemDetail.tsx` — Remove manual inventory update from discrepancy handler; add Reverse Entry button; add Warehouse Sale button; update discrepancy formula; add `warehouse_sale` to movement colors
5. **New component** `src/components/inventory/WarehouseSaleDialog.tsx` — Wholesale sale dialog

### Important Notes

- The trigger uses `ON CONFLICT (item_detail_id, warehouse_id)` which requires the existing composite unique constraint on the `inventory` table.
- Existing data should already be consistent since ledger entries have been created alongside inventory updates. If drift exists, a one-time backfill migration can re-sync: `UPDATE inventory SET quantity_on_hand = (SELECT COALESCE(SUM(quantity),0) FROM inventory_ledger WHERE ...)`.
- Slot-level entries (`slot_id IS NOT NULL, warehouse_id IS NULL`) are intentionally excluded from the trigger — machine slot stock is managed via `machine_slots.current_stock`.

