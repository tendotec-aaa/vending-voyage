

## Hierarchical Swap Selection: Spot → Slot | Category → In-Stock Product

### What Changes

**File: `src/components/routes/PlannedSwapDialog.tsx`** -- Complete rewrite with 4-step cascading selection:

**Step 1 - "Where" section:**
- **Dropdown 1: Select Spot** -- Groups the passed `slots` by `spot_id`/`spot_name`. Displays spot names (e.g., "Main Entrance"). Falls back to `"Machine at [location]"` if `spot_name` is empty.
- **Dropdown 2: Select Slot** -- Disabled until a Spot is selected. Filters `slots` to only those matching the selected `spot_id`. Display format: `"Slot [Number]: [Current Product Name]"` (or "Empty").

**Step 2 - "What" section:**
- **Dropdown 3: Select Category** -- Fetches categories from the `categories` table. Standard dropdown.
- **Dropdown 4: Select New Product** -- Disabled until a Category is selected. Queries `item_details` filtered by `category_id` and `type = 'merchandise'`, then joins with `inventory` table to only show products where `quantity_on_hand > 0` (summed across all warehouses). Display format: `"[Product Name] — ([Qty] available)"`.

**New query** inside the dialog (enabled when `open && selectedCategoryId` is set):
```sql
-- Pseudocode for the in-stock product query
SELECT id.id, id.name, SUM(inv.quantity_on_hand) as available
FROM item_details id
JOIN inventory inv ON inv.item_detail_id = id.id
  AND inv.warehouse_id IS NOT NULL
WHERE id.category_id = :categoryId
  AND id.type = 'merchandise'
GROUP BY id.id, id.name
HAVING SUM(inv.quantity_on_hand) > 0
ORDER BY id.name
```

**UI/UX:**
- Confirm button disabled until all 4 selections are made
- Preview card shows: Spot name, slot number, old → new product, and load quantity
- Resetting a parent dropdown clears its children (selecting a new Spot clears Slot; selecting a new Category clears Product)

**Props change:** Add `locationName: string` prop so the fallback can read `"Machine at [Location Name]"` instead of using the spot ID.

**File: `src/components/routes/RouteStopCard.tsx`** -- Pass `locationName={stop.location?.name || "Unknown"}` to `PlannedSwapDialog`.

**No changes** to `useRoutes.tsx` -- the slot data already contains `spot_id` and `spot_name`. No database changes needed. Planning only -- no ledger or `machine_slots` writes.

### Technical Details

- State: `selectedSpotId`, `selectedSlotId`, `selectedCategoryId`, `newProductId`
- 3 queries: categories (static), in-stock products (dependent on category), existing swap-products query removed
- The `PlannedAction` interface already has all needed fields -- no changes
- The inventory query uses a raw approach: fetch `item_details` by category, then fetch `inventory` rows for those items with `warehouse_id IS NOT NULL`, aggregate in JS (avoids needing a DB function)

