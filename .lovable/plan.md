

## Bug Fix: Missing Sales/False Coin Ledger "Out" Entries

### Root Cause

The edge function is **NOT the problem**. Sales and false coins are correctly written to `inventory_ledger` with `slot_id` set and `warehouse_id = null`.

The bug is in `src/pages/ItemDetail.tsx`, line 250:

```typescript
.not("warehouse_id", "is", null)
```

This filter means: "only show entries WHERE warehouse_id IS NOT NULL." Since all slot-based movements (sales, false coins, refills to slot, removals from slot, adjustments) have `warehouse_id = null`, they are **completely excluded** from the ledger view.

This filter was likely added to separate warehouse-specific ledger entries, but it inadvertently hid all slot-level "Out" movements.

### Fix

**File: `src/pages/ItemDetail.tsx` (line 250)**

Remove the `.not("warehouse_id", "is", null)` filter so the query returns both warehouse-based AND slot-based ledger entries:

```typescript
// REMOVE this line:
.not("warehouse_id", "is", null)
```

The query becomes:
```typescript
.from("inventory_ledger")
.select(`...`)
.eq("item_detail_id", id!)
.order("created_at", { ascending: false })
.limit(200);
```

This single-line removal restores visibility of all slot-level movements (sales, false coins, refills, removals, adjustments) in the Item Detail ledger view.

No edge function changes needed. No database changes needed.

