

## Clarification: `running_balance` on `inventory_ledger`

### Current Reality
- The `running_balance` column is `NOT NULL` with **no default** value.
- There is **no BEFORE INSERT trigger** that auto-computes it.
- The only trigger (`trg_sync_inventory_after_ledger`) is an AFTER INSERT trigger that syncs the `inventory.quantity_on_hand` table — it does not touch `running_balance`.
- **Every existing ledger insert** (in `useReceiveStock`, `useAssemblies`, `WarehouseSaleDialog`, `submit-visit-report` edge function, `Visits.tsx` reversal logic) manually computes and passes `running_balance`.

### What I Recommend

**Create a BEFORE INSERT trigger** that auto-computes `running_balance` as `COALESCE(SUM(quantity), 0)` for the matching `(item_detail_id, warehouse_id)` or `(item_detail_id, slot_id)` pair. This way:

1. The new `create_sales_order` RPC only passes the quantity delta — no running_balance math.
2. All existing code continues to work (the trigger simply overwrites whatever value was passed).
3. Future code never needs to worry about computing it.

#### Trigger SQL

```sql
CREATE OR REPLACE FUNCTION public.compute_ledger_running_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.warehouse_id IS NOT NULL THEN
    NEW.running_balance := COALESCE(
      (SELECT SUM(quantity) FROM public.inventory_ledger
       WHERE item_detail_id = NEW.item_detail_id 
         AND warehouse_id = NEW.warehouse_id),
      0
    ) + NEW.quantity;
  ELSIF NEW.slot_id IS NOT NULL THEN
    NEW.running_balance := COALESCE(
      (SELECT SUM(quantity) FROM public.inventory_ledger
       WHERE item_detail_id = NEW.item_detail_id 
         AND slot_id = NEW.slot_id),
      0
    ) + NEW.quantity;
  ELSE
    NEW.running_balance := NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_running_balance
  BEFORE INSERT ON public.inventory_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_ledger_running_balance();
```

This fires BEFORE the existing AFTER INSERT trigger, so `running_balance` is always correct regardless of what the caller passes.

#### RPC `create_sales_order` ledger INSERT (exact SQL)

```sql
INSERT INTO public.inventory_ledger (
  item_detail_id, warehouse_id, movement_type,
  quantity, running_balance,
  reference_id, reference_type, performed_by, notes
)
VALUES (
  line_item.item_detail_id,
  p_warehouse_id,
  'warehouse_sale',
  -(line_item.quantity),   -- negative delta only
  0,                       -- placeholder; trigger overwrites this
  v_sale_id,
  'sale',
  p_created_by,
  'Sale ' || v_sale_number
);
```

The `0` is a dummy value to satisfy the NOT NULL constraint. The BEFORE INSERT trigger replaces it with the correct computed balance before the row is written.

### Impact on Existing Code
- **Zero breakage.** All existing inserts pass a `running_balance` value — the trigger simply overwrites it with the authoritative computed value. Existing behavior is preserved (and actually made more reliable).
- Optionally, we can later refactor all existing code to pass `0` as well, but it's not required for this feature.

### Full Implementation Plan

Once you approve this trigger approach, I will implement:

1. **Migration 1**: BEFORE INSERT trigger `compute_ledger_running_balance`
2. **Migration 2**: `sales` + `sale_items` tables with RLS
3. **Migration 3**: `create_sales_order` RPC function (atomic transaction, no running_balance math)
4. **Frontend**: `useSales.tsx` hook, `Sales.tsx` list page, `NewSale.tsx` form (with soft stock warning), `SaleDetail.tsx` detail page
5. **Routing + sidebar**: 3 routes, sidebar link with DollarSign icon

