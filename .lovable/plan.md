

## Integrate In-Stock Logic with New Item Flags

### Overview

Enforce strict stock quantity rules across actionable workflows (Visit Reports, Swaps, Assemblies) while allowing toggle-controlled zero-stock visibility in Inventory/Warehouse pages.

---

### Current State Analysis

| Workflow | Flag Filter | Stock Filter | Status |
|----------|-------------|--------------|--------|
| **NewVisitReport.tsx** (products query ~369) | `is_routable = true` ✓ | None ✗ | Needs stock > 0 |
| **PlannedSwapDialog.tsx** (productsQuery ~74) | `is_routable = true` ✓ | `quantity > 0` ✓ | Already correct |
| **NewAssembly.tsx** (inventory query ~74) | `is_component = true` ✓ | `.gt("quantity_on_hand", 0)` ✓ | Already correct |
| **Inventory.tsx** (consolidated query) | `is_sellable/is_asset/is_supply` ✓ | Via `showZeroStock` toggle ✓ | Already correct |
| **Warehouse.tsx** (filteredInventory ~38) | N/A (shows all warehouse items) | Via `showZeroStock` toggle ✓ | Already correct |

---

### Required Changes

**1. NewVisitReport.tsx** (~lines 369-394)

The `products` query fetches all routable items **without checking warehouse stock**. This needs to be restricted so users cannot select products they don't have in the source warehouse.

**Solution:** Replace the current `item_details` query with a two-step approach similar to `PlannedSwapDialog.tsx`:
1. First fetch routable `item_type_id`s
2. Query `inventory` joined with `item_details` where `warehouse_id = sourceWarehouseId` AND `quantity_on_hand > 0`
3. Only show products that have stock in the selected source warehouse

**New query pattern:**
```typescript
// Fetch in-stock routable products from source warehouse
const { data: availableProducts = [] } = useQuery({
  queryKey: ['available-products', sourceWarehouseId],
  queryFn: async () => {
    const { data: routableTypes } = await supabase
      .from("item_types")
      .select("id")
      .eq("is_routable", true);
    const routableIds = (routableTypes || []).map(t => t.id);

    // Get inventory records with stock > 0 in selected warehouse
    let query = supabase
      .from("inventory")
      .select("item_detail_id, quantity_on_hand, item_detail:item_details(id, name, sku, category_id, item_type_id)")
      .eq("warehouse_id", sourceWarehouseId)
      .gt("quantity_on_hand", 0);

    const { data } = await query;
    
    // Filter by routable type and return
    return (data || [])
      .filter(inv => routableIds.includes(inv.item_detail?.item_type_id))
      .map(inv => ({
        id: inv.item_detail.id,
        name: inv.item_detail.name,
        sku: inv.item_detail.sku,
        category_id: inv.item_detail.category_id,
        available: inv.quantity_on_hand
      }));
  },
  enabled: !!sourceWarehouseId,
});
```

**2. Update ToyPicker Component**

Extend props to optionally show available quantity badge next to each product, helping operators see stock levels.

---

### Files Modified

| File | Changes |
|------|---------|
| `src/pages/NewVisitReport.tsx` | Replace `products` query with warehouse-aware `availableProducts` query that filters by `is_routable` AND `stock > 0` in source warehouse. Update references from `products` to `availableProducts`. |
| `src/components/visits/ToyPicker.tsx` | Add optional `showStock` prop and stock display in dropdown items |

---

### No Changes Needed

- **PlannedSwapDialog.tsx**: Already queries inventory with `quantity_on_hand > 0` aggregation
- **NewAssembly.tsx**: Already has `.gt("quantity_on_hand", 0)` and `is_component` filter
- **Inventory.tsx**: `showZeroStock` toggle already controls filtering
- **Warehouse.tsx**: `showZeroStock` toggle already controls filtering

