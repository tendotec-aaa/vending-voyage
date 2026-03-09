

## Switch Inventory Cost to `quantity_on_hand x WAC`

### Problem
Current inventory cost uses FIFO batch remaining (`purchase_items.quantity_remaining * cost`), which diverges from physical stock when negative inventory is allowed.

### Solution
Replace the FIFO batch cost calculation with `quantity_on_hand * weighted_average_cost` per item. WAC is computed from ALL purchase batches (not just active ones) for each item.

### Changes

**1. `src/pages/Inventory.tsx` — `useConsolidatedInventory` query function**

Replace the `purchaseBatches` query (lines 67-71) with a query fetching ALL purchase items (remove `.eq("active_item", true)`) to compute WAC:

```typescript
const { data: allPurchaseItems } = await supabase
  .from("purchase_items")
  .select("item_detail_id, quantity_ordered, landed_unit_cost, final_unit_cost");
```

Add a WAC computation helper that builds a map of `item_detail_id -> weighted_average_cost`:

```typescript
// Build WAC map: total_cost / total_qty across all batches
const wacMap = new Map<string, number>();
const costAcc = new Map<string, { totalCost: number; totalQty: number }>();
for (const b of allPurchaseItems || []) {
  const cost = b.final_unit_cost || b.landed_unit_cost || 0;
  const qty = b.quantity_ordered || 0;
  const acc = costAcc.get(b.item_detail_id) || { totalCost: 0, totalQty: 0 };
  acc.totalCost += qty * cost;
  acc.totalQty += qty;
  costAcc.set(b.item_detail_id, acc);
}
for (const [id, acc] of costAcc) {
  wacMap.set(id, acc.totalQty > 0 ? acc.totalCost / acc.totalQty : 0);
}
```

Then in each item's mapping, replace the FIFO batch cost calculation with:

```typescript
const wac = wacMap.get(item.id) || 0;
const totalInventoryCost = totalQty * wac;
```

This applies to both `machine_model` items (line 88-91) and merchandise items (line 117-121). For machine models, use `totalQty` (non-retired count). For merchandise, use `totalQty` (warehouse + deployed).

Also update the Inventory Cost column cell (line 264-266) to show negative costs in red when `totalInventoryCost < 0`:

```typescript
<TableCell className={`text-right ${item.totalInventoryCost < 0 ? 'text-destructive font-medium' : 'text-foreground'}`}>
```

### No database changes needed
WAC is computed client-side from existing `purchase_items` data. No migration required.

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Inventory.tsx` | Replace FIFO batch cost with `quantity_on_hand * WAC` calculation, red styling for negative costs |

