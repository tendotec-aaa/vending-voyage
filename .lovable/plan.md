

# Database Restructuring Plan: Inventory & Purchase System Overhaul

## Summary

This plan redesigns the database schema to implement **FIFO (First-In-First-Out) inventory costing**, real-time stock tracking across warehouses and machines, and comprehensive landed cost accounting at the purchase item level.

---

## Current State Analysis

### Tables to Modify

| Current Table | New Name | Key Changes |
|---------------|----------|-------------|
| `warehouse_inventory` | `inventory` | Remove `average_cost`, add `warehouse_id`, add `spot_id` for machine tracking |
| `item_definitions` | `item_details` | Track item movements, link to purchases, store current pricing |
| `purchases` | `purchases` | Remove `warehouse_id`, `warehouse_destination`, add `received_inventory` boolean |
| `purchase_lines` | `purchase_items` | Add FIFO costing fields, landed cost breakdown, `active_item` flag, inventory tracking |

### Files That Will Need Updates

| File | Dependencies |
|------|--------------|
| `src/hooks/useWarehouseInventory.tsx` | Queries `warehouse_inventory`, `item_definitions` |
| `src/hooks/usePurchases.tsx` | Queries `purchases`, `purchase_lines`, `warehouses` |
| `src/pages/Warehouse.tsx` | Uses warehouse inventory hook |
| `src/pages/NewPurchase.tsx` | Creates purchase orders and line items |
| `src/pages/Inventory.tsx` | Product inventory display |
| `src/pages/Machines.tsx` | Uses `item_definitions` for models |
| `src/pages/NewVisitReport.tsx` | Uses `item_definitions` for products |
| `src/components/purchases/PurchaseCard.tsx` | Displays purchase lines count |
| `src/components/warehouse/AddWarehouseItemDialog.tsx` | Inserts into warehouse inventory |

---

## New Database Schema Design

### 1. Rename `item_definitions` to `item_details`

This table tracks all items in the system with their current state and links to their purchase history.

```text
item_details (renamed from item_definitions)
├── id (uuid, PK)
├── sku (text, required)
├── name (text, required)
├── type (enum: merchandise, machine, component)
├── description (text)
├── photo_url (text)
├── cost_price (numeric) - current weighted average or latest cost
├── category_id (uuid, FK -> categories)
├── subcategory_id (uuid, FK -> subcategories)
├── created_at (timestamptz)
└── updated_at (timestamptz, NEW)
```

### 2. Rename `warehouse_inventory` to `inventory`

Unified inventory tracking across all locations (warehouses and machine spots).

```text
inventory (renamed from warehouse_inventory)
├── id (uuid, PK)
├── item_detail_id (uuid, FK -> item_details) - renamed from item_definition_id
├── quantity_on_hand (integer)
├── warehouse_id (uuid, FK -> warehouses, nullable) - NEW: for warehouse stock
├── spot_id (uuid, FK -> spots, nullable) - NEW: for in-machine stock
├── slot_id (uuid, FK -> machine_slots, nullable) - NEW: specific slot tracking
├── last_updated (timestamptz)
└── CHECK: Either warehouse_id OR spot_id must be set (XOR constraint)
```

The `average_cost` field is removed because costing now lives at the `purchase_items` level (FIFO).

### 3. Modify `purchases` Table

```text
purchases
├── id (uuid, PK)
├── purchase_order_number (text, required)
├── supplier_id (uuid, FK -> suppliers)
├── type (enum: local, import)
├── status (enum: draft, pending, in_transit, received, cancelled)
├── total_amount (numeric)
├── currency (text)
├── expected_arrival_date (date)
├── local_tax_rate (numeric)
├── received_inventory (boolean, NEW) - indicates ready for inventory assignment
├── received_at (timestamptz, NEW) - when items arrived
├── created_at (timestamptz)
└── REMOVED: warehouse_id, warehouse_destination
```

### 4. Rename `purchase_lines` to `purchase_items`

This becomes the core table for FIFO inventory costing. Each row represents a specific batch of items from a purchase with its own landed cost.

```text
purchase_items (renamed from purchase_lines)
├── id (uuid, PK)
├── purchase_id (uuid, FK -> purchases)
├── item_detail_id (uuid, FK -> item_details) - renamed from item_definition_id
├── quantity_ordered (integer)
├── quantity_received (integer)
├── quantity_remaining (integer, NEW) - tracks unsold inventory from this batch
├── unit_cost (numeric) - base purchase price per unit
├── cbm (numeric) - cubic meters for shipping
│
│ -- Fee Breakdown Fields (NEW) --
├── line_fees_total (numeric, NEW) - sum of item-specific fees
├── global_fees_allocated (numeric, NEW) - distributed portion of global fees
├── tax_allocated (numeric, NEW) - tax portion for this line
├── landed_unit_cost (numeric, NEW) - CALCULATED: (unit_cost * qty + all fees) / qty
│
│ -- Inventory Tracking (NEW) --
├── active_item (boolean, NEW) - false when quantity_remaining = 0
├── inventory_id (uuid, FK -> inventory, nullable, NEW) - links to current stock location
├── arrival_order (integer, NEW) - sequence for FIFO processing
│
├── created_at (timestamptz)
└── updated_at (timestamptz, NEW)
```

### 5. Update Foreign Key References

All tables referencing the old names need updated foreign keys:

| Table | Old FK | New FK |
|-------|--------|--------|
| `inventory` | `item_definition_id` | `item_detail_id` |
| `purchase_items` | `item_definition_id` | `item_detail_id` |
| `machine_slots` | `current_product_id` | Keep as-is (links to `item_details`) |
| `visit_line_items` | `product_id` | Keep as-is (links to `item_details`) |
| `maintenance_tickets` | `product_id` | Keep as-is (links to `item_details`) |

---

## FIFO Costing Logic

### How It Works

When items are sold from a machine:

1. Query `purchase_items` for that `item_detail_id` where `active_item = true`
2. Order by `arrival_order ASC` (oldest first)
3. Deduct from `quantity_remaining` of the oldest batch
4. When `quantity_remaining` reaches 0, set `active_item = false`
5. Move to next batch and continue

### Example Scenario

```text
Purchase 1 (2024): 10,000 units @ $0.13 landed cost
Purchase 2 (2025): 20,000 units @ $0.10 landed cost

Sale of 10,500 units:
├── First 10,000 sold at $0.13 cost (Purchase 1 depleted, active_item = false)
└── Next 500 sold at $0.10 cost (from Purchase 2)
```

### Landed Cost Calculation

When a purchase is received, calculate for each line item:

```text
landed_unit_cost = (
  (unit_cost * quantity_ordered) +    // Base item cost
  line_fees_total +                    // Item-specific fees
  global_fees_allocated +              // Distributed global fees
  tax_allocated                        // Tax portion
) / quantity_ordered
```

---

## Migration Steps

### Step 1: Rename Tables

```sql
ALTER TABLE item_definitions RENAME TO item_details;
ALTER TABLE warehouse_inventory RENAME TO inventory;
ALTER TABLE purchase_lines RENAME TO purchase_items;
```

### Step 2: Add New Columns to `inventory`

```sql
ALTER TABLE inventory 
  ADD COLUMN warehouse_id uuid REFERENCES warehouses(id),
  ADD COLUMN spot_id uuid REFERENCES spots(id),
  ADD COLUMN slot_id uuid REFERENCES machine_slots(id),
  RENAME COLUMN item_definition_id TO item_detail_id;

ALTER TABLE inventory DROP COLUMN average_cost;
```

### Step 3: Add New Columns to `purchases`

```sql
ALTER TABLE purchases
  ADD COLUMN received_inventory boolean DEFAULT false,
  ADD COLUMN received_at timestamptz;

ALTER TABLE purchases 
  DROP COLUMN warehouse_id,
  DROP COLUMN warehouse_destination;
```

### Step 4: Add New Columns to `purchase_items`

```sql
ALTER TABLE purchase_items
  RENAME COLUMN item_definition_id TO item_detail_id;

ALTER TABLE purchase_items
  ADD COLUMN quantity_remaining integer DEFAULT 0,
  ADD COLUMN line_fees_total numeric DEFAULT 0,
  ADD COLUMN global_fees_allocated numeric DEFAULT 0,
  ADD COLUMN tax_allocated numeric DEFAULT 0,
  ADD COLUMN landed_unit_cost numeric DEFAULT 0,
  ADD COLUMN active_item boolean DEFAULT true,
  ADD COLUMN inventory_id uuid REFERENCES inventory(id),
  ADD COLUMN arrival_order integer,
  ADD COLUMN updated_at timestamptz DEFAULT now();
```

### Step 5: Add Columns to `item_details`

```sql
ALTER TABLE item_details
  ADD COLUMN updated_at timestamptz DEFAULT now();
```

### Step 6: Update Foreign Key Constraints

Rename constraint references and update any views that reference the old table names.

### Step 7: Create Validation Trigger for Inventory Location

```sql
CREATE OR REPLACE FUNCTION validate_inventory_location()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.warehouse_id IS NULL AND NEW.spot_id IS NULL) THEN
    RAISE EXCEPTION 'Inventory must have either warehouse_id or spot_id set';
  END IF;
  IF (NEW.warehouse_id IS NOT NULL AND NEW.spot_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Inventory cannot have both warehouse_id and spot_id set';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_inventory_location
  BEFORE INSERT OR UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION validate_inventory_location();
```

### Step 8: Update RLS Policies

All existing RLS policies will need to reference the new table names.

---

## Frontend Code Updates

### Hooks to Update

| Hook | Changes |
|------|---------|
| `useWarehouseInventory.tsx` | Query `inventory` table, update column names, remove average cost logic |
| `usePurchases.tsx` | Query `purchase_items`, remove warehouse fields, add received_inventory handling |

### Pages to Update

| Page | Changes |
|------|---------|
| `Warehouse.tsx` | Use new `inventory` table with `warehouse_id` filter |
| `NewPurchase.tsx` | Use `item_details`, create `purchase_items`, calculate landed costs |
| `Inventory.tsx` | Show consolidated view from `inventory` table |
| `Machines.tsx` | Reference `item_details` instead of `item_definitions` |
| `NewVisitReport.tsx` | Reference `item_details` instead of `item_definitions` |

### Components to Update

| Component | Changes |
|-----------|---------|
| `AddWarehouseItemDialog.tsx` | Create inventory records with `warehouse_id` |
| `PurchaseCard.tsx` | Display from `purchase_items` instead of `purchase_lines` |
| `WarehouseItemCard.tsx` | Updated field names |

---

## Data Flow Diagrams

### Purchase Receiving Flow

```text
Purchase Order Created (status: pending)
         │
         ▼
   Items In Transit (status: in_transit)
         │
         ▼
   Items Received (received_inventory: true)
         │
         ├──► Calculate landed_unit_cost per item
         │    (base + line fees + global fees + tax)
         │
         ▼
   Assign to Warehouse (create inventory records)
         │
         ├──► Set inventory.warehouse_id
         ├──► Set purchase_item.inventory_id
         └──► Set purchase_item.quantity_remaining = quantity_received
```

### FIFO Sales Flow

```text
Sale Made at Machine Slot
         │
         ▼
   Query Active Purchase Items for product
   (WHERE active_item = true ORDER BY arrival_order)
         │
         ▼
   Deduct from Oldest Batch First
         │
         ├──► quantity_remaining -= sold_qty
         ├──► IF quantity_remaining = 0
         │         └──► active_item = false
         │
         ▼
   Record Cost of Goods Sold
   (using landed_unit_cost from that batch)
```

---

## Summary of Breaking Changes

1. **Table renames** - All queries must use new table names
2. **Column renames** - `item_definition_id` becomes `item_detail_id`
3. **Removed columns** - `average_cost` from inventory, `warehouse_id`/`warehouse_destination` from purchases
4. **New required logic** - Landed cost calculation, FIFO deduction, inventory location validation
5. **TypeScript types** - Will auto-regenerate after migration

---

## Implementation Order

1. Create and run database migration
2. Update TypeScript types (auto-generated)
3. Update hooks (`useWarehouseInventory`, `usePurchases`)
4. Update pages (`Warehouse`, `NewPurchase`, `Inventory`, `Machines`, `NewVisitReport`)
5. Update components (`AddWarehouseItemDialog`, `PurchaseCard`, `WarehouseItemCard`)
6. Test purchase receiving flow
7. Test FIFO sales deduction

