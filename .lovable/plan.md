

## Remove Strict Stock Blocking (Allow Negative Inventory)

### Overview

Remove all `quantity_on_hand > 0` filters from actionable workflow queries. Item dropdowns will be filtered strictly by item type flags (`is_routable`, `is_component`), never by stock. Negative stock values will display in red on Inventory/Warehouse pages.

### Changes

**1. `src/pages/NewVisitReport.tsx` (~lines 401-435)**

Replace the inventory-based query with a direct `item_details` query filtered by `is_routable` item types. Then LEFT JOIN inventory to get stock for display purposes only:

- Query `item_details` where `item_type_id` is in routable type IDs (no warehouse/stock filter)
- Separately query `inventory` for the selected `sourceWarehouseId` to get stock quantities
- Merge: every routable item appears with `available` showing actual stock (can be 0 or negative)
- Keep `showStock` badge in ToyPicker showing "(0 available)" etc.

**2. `src/components/routes/PlannedSwapDialog.tsx` (~lines 116-123)**

Remove the `.filter((item) => (qtyMap.get(item.id) || 0) > 0)` line. Return ALL routable items in the category, with `available` set to `qtyMap.get(item.id) || 0` (which may be 0 or negative).

**3. `src/pages/NewAssembly.tsx` (~line 81)**

Remove `.gt("quantity_on_hand", 0)` from the inventory query. Also query `item_details` directly for component-type items so items with zero inventory records still appear. Merge with inventory data for stock display.

**4. `src/pages/Warehouse.tsx` & `src/pages/Inventory.tsx`**

Update the filtered display to show negative quantities in red (`text-destructive` class). The `showZeroStock` toggle label changes to "Show zero/negative stock" and filters `<= 0` instead of `=== 0`.

### Files Modified

| File | Change |
|------|--------|
| `src/pages/NewVisitReport.tsx` | Replace inventory query with item_details query + optional stock lookup |
| `src/components/routes/PlannedSwapDialog.tsx` | Remove `> 0` stock filter on line 118 |
| `src/pages/NewAssembly.tsx` | Remove `.gt("quantity_on_hand", 0)`, query all component items |
| `src/pages/Warehouse.tsx` | Red styling for negative quantities, update toggle filter |
| `src/pages/Inventory.tsx` | Red styling for negative quantities, update toggle filter |

