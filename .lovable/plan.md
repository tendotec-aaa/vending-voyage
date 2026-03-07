

## Plan: Hide Zero-Stock Items by Default on Inventory and Warehouse Pages

### Approach
Add a toggle (Switch component) on both pages to hide items with 0 stock. Default state: **hidden** (only show items with quantity != 0). Users can toggle to "Show all" to see zero-stock items.

### Changes

#### 1. Inventory Page (`src/pages/Inventory.tsx`)
- Add `showZeroStock` state, defaulting to `false`
- Add a Switch + label in the filter area (next to the search input)
- In `filteredInventory`, add filter: when `!showZeroStock`, exclude items where `item.total === 0`

#### 2. Warehouse Page (`src/pages/Warehouse.tsx`)
- Add `showZeroStock` state, defaulting to `false`
- Add a Switch + label in the filter card (next to search and category filter)
- In `filteredInventory`, add filter: when `!showZeroStock`, exclude items where `item.quantity_on_hand === 0`

Both pages will use the existing `Switch` component from `@/components/ui/switch` and `Label` from `@/components/ui/label`.

