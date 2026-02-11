

# Plan: Warehouse List View, Inventory Item Detail, Machine Fix, Setup Machine Assignment, Locations Accordion, and Sidebar Reorder

## Summary

This plan covers 6 changes: (1) Warehouse list view with item detail page, (2) Inventory item detail page + remove stock level bar + fix cost display, (3) Fix machine registration model dropdown, (4) Setup machine assignment during creation, (5) Locations page to list+accordion layout with spot detail enhancements, (6) Sidebar section reorder.

---

## 1. Warehouse: List View + Item Detail Page

**Current**: Card grid of inventory items per warehouse.
**Target**: Table/list view showing key info per item. Clicking a row navigates to an item detail page.

### Warehouse List View (`src/pages/Warehouse.tsx`)
- Replace the card grid with a table:
  - Columns: Item Name, SKU, Category, Warehouse, Quantity, Last Updated
- Each row is clickable, navigates to `/inventory/:id` (item detail page)
- Keep the warehouse selector tabs, summary cards, filters, and "Add Items" / "Create Warehouse" buttons

### New: Item Detail Page (`src/pages/ItemDetail.tsx`)
- Route: `/inventory/:id`
- Fetches from `item_details` by ID, plus aggregated inventory across warehouses and machine slots
- View/Edit mode for admin users
- Editable fields: name, description, category, subcategory, cost_price, photo_url
- SKU displayed but NOT editable (read-only)
- Shows:
  - Item info card (name, SKU, description, category, subcategory)
  - Cost card (cost_price from item_details -- this is the catalog cost, not from purchases)
  - Stock breakdown card: warehouse quantities, in-machine quantities
  - Purchase history: recent `purchase_items` linked to this `item_detail_id`

### Cost Explanation
The `$0.00` cost is because `item_details.cost_price` defaults to `0`. This field is the catalog/base cost. For accurate costing, the landed cost from purchase items should be used. On the item detail page, we will show both the catalog cost and the average landed cost from `purchase_items`.

---

## 2. Inventory Page: Clickable Rows + Remove Stock Level Bar

### Changes to `src/pages/Inventory.tsx`
- Make each table row clickable, navigating to `/inventory/:id` (same item detail page)
- **Remove the "Stock Level" column** entirely (the progress bar and badge). The `minStock: 100` is a hardcoded arbitrary value with no real data backing it
- **Remove the "Low Stock Items" summary card** (same reason -- based on fake threshold)
- Keep columns: SKU, Product Name, Category, Warehouse, In Machines, Cost, Total
- Cost column: show `cost_price` from `item_details`. If zero, show "N/A" instead of "$0.00"

---

## 3. Fix Machine Registration: Model -> Item Name

**Problem**: The "Model" dropdown shows items from `item_details` filtered by `category_id`, but if no items exist in that category, it's empty. The label says "Model" which is confusing.

### Changes to `src/pages/Machines.tsx`
- Rename "Model" label to **"Item Name"**
- Change placeholder text to "Select an item" / "Select category first"
- The filtering logic (`item_details` by `selectedCategoryId`) is correct -- the issue is that there are no `item_details` rows with a category matching the selected category. This is a data issue, not a code bug.
- Add a fallback: if `models` array is empty when a category is selected, show a helper message: "No items found in this category. Create items first via a Purchase Order."
- This ensures the user understands why the dropdown is empty

---

## 4. Setup Creation: Machine Selection with Position Labels

**Current**: Create setup dialog only takes name + type. Machines are added afterward via "Manage Machines".
**Target**: During creation, user selects specific machines based on setup type and assigns positions.

### Setup Type -> Machine Count Mapping
| Type | Machines | Position Labels |
|------|----------|-----------------|
| Single | 1 | (no label needed) |
| Double | 2 | Position 1, Position 2 |
| Triple | 3 | Left, Center, Right |
| Quad | 4 | Position 1, Position 2, Position 3, Position 4 |
| Custom | N (user specifies) | Position 1, Position 2, ... Position N |

### Changes to `src/pages/Setups.tsx`
- In the Create Setup dialog:
  - After selecting type, show machine slot selectors
  - For "custom" type, add a "Number of Machines" input
  - Each slot shows a dropdown of available machines (status = 'in_warehouse', setup_id = null)
  - Position labels based on type (Left/Center/Right for triple, numbered for others)
- Update `createSetup` mutation to:
  1. Create the setup
  2. Assign selected machines to the setup with `position_on_setup` and `status = 'deployed'`
- In the "Manage Machines" dialog:
  - Show position labels next to each assigned machine
  - Allow reordering or reassigning positions

### Position Label Logic (utility function)
```text
getPositionLabel(type, position, totalMachines):
  if totalMachines === 1: return "" (no label)
  if type === "triple": return ["Left", "Center", "Right"][position - 1]
  return `Position ${position}`
```

---

## 5. Locations Page: List View with Accordion + Spot Detail Enhancements

### Locations Page (`src/pages/Locations.tsx`)
**Current**: Card grid where entire card is clickable to location detail.
**Target**: Table/list view where:
- Each row shows: Location Name (clickable link to detail), Address, Rent, Spots count, Contract dates
- Each row has an expandable accordion that shows its spots
- Inside accordion: spot summary info (name, status, assigned setup, rent per spot)
- Spot name is clickable, navigates to `/spots/:id`
- Keep the "New Location" button and search

### Spot Detail Page Enhancements (`src/pages/SpotDetail.tsx`)
- Add "Assign Setup" button/section for admin users:
  - Dropdown to select from available setups (not assigned to any spot)
  - Mutation to update `setups.spot_id` to this spot's ID
- Add "Machines" card:
  - Fetch machines via their setup (`machines.setup_id` matching the setup assigned to this spot)
  - Show serial number, model/item name, position, status
- Add "Inventory" card:
  - Fetch from `inventory` where `spot_id = this spot's ID`
  - Show item name, quantity on hand
- The "Recent Visits" section already exists -- keep it

---

## 6. Sidebar: Reorder Sections

**Current order**: Dashboard, Operations, Assets & Inventory, Supply Chain, Locations, Insights, Business, Personal

**New order**: Dashboard, Operations, Assets & Inventory, **Locations**, **Supply Chain**, Insights, Business, Personal

### Changes to `src/components/layout/AppSidebar.tsx`
- Swap the position of the Locations section and Supply Chain section in the render order
- Move the Locations `SidebarGroup` block above the Supply Chain `SidebarGroup` block

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/pages/ItemDetail.tsx` | Item detail page with edit capability |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/Warehouse.tsx` | Card grid to table list view, clickable rows |
| `src/pages/Inventory.tsx` | Remove stock level bar, clickable rows, fix $0.00 display |
| `src/pages/Machines.tsx` | Rename "Model" to "Item Name", add empty state message |
| `src/pages/Setups.tsx` | Add machine selection with positions to create dialog |
| `src/pages/Locations.tsx` | Card grid to table+accordion layout |
| `src/pages/SpotDetail.tsx` | Add setup assignment, machines, and inventory cards |
| `src/components/layout/AppSidebar.tsx` | Swap Locations and Supply Chain sections |
| `src/App.tsx` | Add `/inventory/:id` route |

---

## Implementation Order

1. Sidebar reorder (quick win)
2. Item Detail page (needed by both Warehouse and Inventory)
3. Warehouse list view conversion
4. Inventory page fixes (remove stock bar, clickable rows, cost display)
5. Machine registration label fix
6. Setup creation with machine selection
7. Locations page list+accordion conversion
8. Spot Detail page enhancements
9. Route registration in App.tsx

