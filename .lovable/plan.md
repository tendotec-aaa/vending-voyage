

# Plan: Warehouse Revamp + Receive Stock Workflow

## Summary

Redesign the Warehouse page into a multi-warehouse management hub and build a full "Receive Stock" workflow in the Inventory page. When a purchase order arrives, users formally receive items, verify quantities, distribute across warehouses, and handle discrepancies with an auditable trail.

---

## Current State

| Area | Status |
|------|--------|
| `purchase_items` table | Already has `quantity_ordered`, `quantity_received`, `quantity_remaining`, `active_item` |
| `purchases` table | Already has `received_inventory`, `received_at`, `status` (includes 'received') |
| `warehouses` table | Has `id`, `name`, `address` |
| `inventory` table | Tracks stock by `item_detail_id` + `warehouse_id` with `quantity_on_hand` |
| Warehouse page | Flat list of all inventory items, no warehouse switching |
| Inventory page | Consolidated view with non-functional "Receive Stock" and "Transfer Stock" buttons |

---

## Database Changes

### 1. Add fields to `warehouses` table

| New Column | Type | Default | Purpose |
|------------|------|---------|---------|
| `is_system` | boolean | `false` | Marks special system warehouses (e.g., Unaccounted Inventory) |
| `description` | text | null | Optional notes about the warehouse |

### 2. New table: `receiving_notes`

Records discrepancies between expected and actual quantities during receiving.

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `id` | uuid (PK) | No | `gen_random_uuid()` | Primary key |
| `purchase_id` | uuid | No | - | FK to purchases |
| `purchase_item_id` | uuid | No | - | FK to purchase_items |
| `quantity_expected` | integer | No | - | What was ordered |
| `quantity_received` | integer | No | - | What actually arrived |
| `difference` | integer | No | - | Expected - Received |
| `note` | text | Yes | - | User explanation for discrepancy |
| `created_at` | timestamptz | No | `now()` | When recorded |
| `created_by` | uuid | Yes | - | User who recorded it |

RLS: All authenticated users can CRUD (matches existing inventory policy pattern).

### 3. New table: `receiving_allocations`

Tracks how received items are distributed across warehouses during receiving.

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `id` | uuid (PK) | No | `gen_random_uuid()` | Primary key |
| `purchase_id` | uuid | No | - | FK to purchases |
| `purchase_item_id` | uuid | No | - | FK to purchase_items |
| `warehouse_id` | uuid | No | - | FK to warehouses (destination) |
| `quantity` | integer | No | - | Units allocated to this warehouse |
| `created_at` | timestamptz | No | `now()` | When allocated |

RLS: All authenticated users can CRUD.

### 4. Seed a system warehouse

Insert a default warehouse named **"Unaccounted Inventory"** with `is_system = true`. This is where missing/unaccounted stock gets assigned when a user confirms items didn't arrive.

---

## Workflow: Receive Stock (in Inventory page)

### Step-by-step flow when user clicks "Receive Stock":

```text
1. OPEN DIALOG/SHEET
   -> Shows list of purchase orders with status = 'in_transit' or 'received' (where received_inventory = false)
   -> User selects a purchase order

2. ITEM VERIFICATION
   -> Shows all purchase_items for that PO
   -> Each row shows:
      - Item name, SKU
      - Quantity Ordered
      - Quantity Already Received (from previous partial receives)
      - Quantity Remaining (to receive)
      - INPUT: "Quantity Received" (defaults to quantity_remaining)
   -> System auto-detects discrepancies

3. WAREHOUSE ALLOCATION
   -> For each item, user distributes received quantity across warehouses
   -> Example: 10,000 received -> 7,000 to Warehouse A, 3,000 to Warehouse B
   -> Validation: allocated total must equal quantity received

4. DISCREPANCY HANDLING
   -> If total received differs from total expected:
      - A confirmation dialog appears
      - Shows exact list of items with shortages
      - User must type a reason/acknowledgment
      - Unaccounted items are transferred to "Unaccounted Inventory" warehouse
      - A receiving_note is created for each discrepancy

5. FINALIZE
   -> Update purchase_items: set quantity_received, update quantity_remaining
   -> Insert inventory records (or update existing) for each warehouse allocation
   -> Create receiving_notes for any discrepancies
   -> Create receiving_allocations for audit trail
   -> Mark purchase as received_inventory = true, received_at = now()
```

---

## Warehouse Page Revamp

### New Layout

**Header Area:**
- Title: "Warehouses"
- "New Warehouse" button (opens dialog to create warehouse)

**Warehouse Tabs/Selector:**
- Dropdown or tab bar to switch between warehouses
- Shows warehouse name + item count badge
- "All Warehouses" option for combined view

**Per-Warehouse View:**
- Summary cards: Total SKUs, Total Items, Total Value
- Search + category/subcategory filters (existing)
- Item cards grid (existing `WarehouseItemCard` pattern)
- "Add Items" button (kept, for manual adjustments)

**Create Warehouse Dialog:**
- Name (required)
- Address (optional)
- Description (optional)

**Warehouse Details:**
- Editable name, address, description
- Cannot delete system warehouses (Unaccounted Inventory)

---

## Inventory Page Updates

### Changes:
- **"Receive Stock" button** becomes functional (opens the receive workflow)
- **"Transfer Stock" button** stays as placeholder (future feature)
- Add a **"Pending Receipts" badge** next to Receive Stock showing count of unreceived POs

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/inventory/ReceiveStockDialog.tsx` | Main receive stock dialog/sheet with multi-step workflow |
| `src/components/inventory/ReceiveStockItemRow.tsx` | Individual item row with quantity input + warehouse allocation |
| `src/components/inventory/DiscrepancyConfirmDialog.tsx` | Confirmation dialog for missing stock acknowledgment |
| `src/components/warehouse/CreateWarehouseDialog.tsx` | Dialog to create new warehouses |
| `src/hooks/useReceiveStock.tsx` | Hook for receiving workflow mutations |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Warehouse.tsx` | Complete revamp with warehouse selector, per-warehouse view |
| `src/pages/Inventory.tsx` | Wire up Receive Stock button, add pending receipts badge |
| `src/hooks/useWarehouseInventory.tsx` | Add warehouse filtering, warehouse CRUD |
| `src/hooks/usePurchases.tsx` | Add query for unreceived purchases |
| `src/components/warehouse/WarehouseItemCard.tsx` | Minor updates for warehouse context |

---

## Technical Details

### Receive Stock Mutation Flow

```text
For each purchase_item:
  1. Update purchase_items SET
       quantity_received = quantity_received + actual_qty,
       quantity_remaining = quantity_remaining - actual_qty

  2. For each warehouse allocation:
     - UPSERT inventory (item_detail_id + warehouse_id)
       ADD quantity to quantity_on_hand

  3. If discrepancy exists:
     - INSERT receiving_note with explanation
     - UPSERT inventory for "Unaccounted Inventory" warehouse
       with the missing quantity

After all items processed:
  - UPDATE purchases SET
      received_inventory = true,
      received_at = now(),
      status = 'received'
```

### Unreceived Purchases Query

```sql
SELECT * FROM purchases
WHERE status IN ('in_transit', 'received')
  AND received_inventory = false
ORDER BY expected_arrival_date ASC
```

### Warehouse Inventory Query (filtered)

```sql
SELECT i.*, id.name, id.sku, w.name as warehouse_name
FROM inventory i
JOIN item_details id ON i.item_detail_id = id.id
LEFT JOIN warehouses w ON i.warehouse_id = w.id
WHERE i.warehouse_id = :selected_warehouse_id
ORDER BY id.name
```

---

## Implementation Order

1. Run database migration (add warehouse fields, create receiving_notes + receiving_allocations tables, seed Unaccounted Inventory warehouse)
2. Create `useReceiveStock` hook with all receiving logic
3. Create `ReceiveStockItemRow` component
4. Create `DiscrepancyConfirmDialog` component
5. Create `ReceiveStockDialog` component (assembles the workflow)
6. Update `Inventory.tsx` to wire up Receive Stock button
7. Create `CreateWarehouseDialog` component
8. Revamp `Warehouse.tsx` with warehouse selector and per-warehouse views
9. Update `useWarehouseInventory` hook for warehouse filtering
10. Update `usePurchases` hook with unreceived PO query

