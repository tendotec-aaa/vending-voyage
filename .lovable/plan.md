

# Comprehensive Plan: Item Types, Purchase Fixes, and Assembly Feature

This is a large set of changes spanning database schema, purchase workflow fixes, UI renames, and an entirely new Assembly feature. Here is the full breakdown.

---

## Part 1: New `item_types` Table and Combobox

### Problem
The current `item_details.type` column uses a hardcoded Postgres enum (`machine_model`, `merchandise`, `spare_part`, `supply`). The user wants a dynamic, user-managed table so they can create/delete item types freely.

### Database Changes
- Create `item_types` table: `id (uuid PK)`, `name (text, unique)`, `created_at`
- Add `item_type_id (uuid FK → item_types.id)` column to `item_details`
- Seed default rows: "Machine Model", "Merchandise", "Spare Part", "Supply" (matching existing enum values)
- Backfill `item_type_id` on existing `item_details` rows based on their current `type` enum value
- RLS: authenticated users can CRUD

### Frontend Changes
- **New hook `src/hooks/useItemTypes.tsx`**: CRUD operations for `item_types`, including a delete check that queries `item_details` for linked items before allowing deletion
- **NewPurchase.tsx**: Add `CreatableCombobox` for "Item Type" next to the Category combobox. Store `item_type_id` on the line item and pass it through to `usePurchases` when creating `item_details`
- **Delete protection dialog**: When deleting an item type that has linked items, show a dialog listing those items so the user can reassign them first

### Files Modified
- New migration SQL
- New: `src/hooks/useItemTypes.tsx`
- Modified: `src/pages/NewPurchase.tsx` (add Item Type combobox)
- Modified: `src/hooks/usePurchases.tsx` (pass `item_type_id` when creating item_details)

---

## Part 2: UI Renames (Quick Fixes)

### Changes
1. **NewPurchase.tsx line 723**: "Per-Item Landed Costs" → "Per-Item Cost" (only when `orderType === "local"`, keep "Per-Item Landed Costs" for import)
2. **NewPurchase.tsx line 431**: "Line Items" → "Item Descriptions"
3. **PurchaseDetail.tsx line 435**: "Line Items" → "Item Descriptions"

---

## Part 3: Fix First Line Item SKU Not Showing

### Problem
The first line item is initialized with `sku: ""` (line 80), while subsequent items get `sku: generateSku()` (line 106).

### Fix
Change line 80 initialization to also call `generateSku()`:
```typescript
{ item_name: "", sku: generateSku(), quantity_ordered: 1, unit_cost: 0, cbm: 0, fees: [] }
```
But `generateSku` is defined on line 100, after the state init on line 79. Since `useState` uses lazy init, we just need to call the function inline or use `Date.now().toString(36).toUpperCase()` directly.

---

## Part 4: Fix Local Purchase Cost Calculations

### Problem
When creating a purchase order, the `usePurchases.tsx` `createPurchaseMutation` never calculates or saves `line_fees_total`, `global_fees_allocated`, `tax_allocated`, `landed_unit_cost`, or `final_unit_cost` on `purchase_items`. It also never updates `item_details.cost_price`.

### Root Cause
The `createPurchaseMutation` in `usePurchases.tsx` only inserts raw line items without computing costs. The cost calculation only happens in `PurchaseDetail.tsx` via `applyFeesMutation` — but that requires the user to manually click "Apply Fee Changes" on the detail page.

### Fix: Calculate costs at creation time
After inserting line items and fees in `createPurchaseMutation`, run the same cost calculation logic that `applyFeesMutation` uses:
1. For each purchase item, compute `line_fees_total`, `global_fees_allocated`, `tax_allocated`, `landed_unit_cost`, `final_unit_cost`
2. Update each `purchase_items` row with these values
3. Update `item_details.cost_price` with the `final_unit_cost`

### Fix: Auto-calculate on status change to "arrived"
In `PurchaseDetail.tsx`, when the status is changed to "arrived", automatically trigger the cost recalculation (same logic as `applyFeesMutation`). This ensures costs are always computed even if the user didn't manually click "Apply".

---

## Part 5: Local Purchases Auto-Marked as Arrived

### Problem
Local purchases are bought locally so they don't need an "in transit" → "arrived" flow.

### Fix
In `usePurchases.tsx` `createPurchaseMutation`, when `type === "local"`:
- Set initial status to `"arrived"` instead of `"pending"`
- Set `received_at` to the current timestamp
- This makes the purchase immediately eligible for receiving

---

## Part 6: Per-Item Cost Breakdown in PurchaseDetail

### Problem
The PurchaseDetail page shows individual item cost breakdowns inline but doesn't have a dedicated summary section at the bottom like NewPurchase does.

### Fix
Add a "Per-Item Cost" card at the bottom of `PurchaseDetail.tsx` (after the Cost Summary card) that shows each item's final unit cost in a clean summary format, similar to the NewPurchase summary section.

---

## Part 7: Assembly Feature (New Tables + Page)

### Database Changes

**`assemblies` table:**
- `id` (uuid PK)
- `assembly_number` (text, auto-generated like PO numbers: `ASM-{timestamp}`)
- `output_item_detail_id` (uuid FK → item_details.id)
- `output_quantity` (integer)
- `labor_cost_per_unit` (numeric, default 0)
- `total_labor_cost` (numeric, default 0)
- `total_component_cost` (numeric, default 0)
- `final_unit_cost` (numeric, default 0)
- `status` (text: 'draft' | 'completed', default 'draft')
- `notes` (text, nullable)
- `created_at`, `created_by` (uuid)

**`assembly_components` table:**
- `id` (uuid PK)
- `assembly_id` (uuid FK → assemblies.id, ON DELETE CASCADE)
- `item_detail_id` (uuid FK → item_details.id)
- `quantity_per_unit` (integer) — how many of this component per 1 output unit
- `total_quantity` (integer) — quantity_per_unit × output_quantity
- `unit_cost` (numeric) — captured at time of assembly from FIFO
- `total_cost` (numeric)
- `created_at`

RLS: authenticated users can CRUD on both tables.

### Frontend Changes

**New page: `src/pages/NewAssembly.tsx`**
Three sections mirroring the PO workflow:

1. **Assembly Header**: Output item (new or link existing via CreatableCombobox), category, subcategory, item type, output quantity
2. **Component Selection**: Search/select existing inventory items, specify quantity per unit, auto-fetch current FIFO cost, show subtotal
3. **Labor & Overhead**: Toggle between per-unit or batch labor cost entry, live calculation summary

**New hook: `src/hooks/useAssemblies.tsx`**
- Create assembly mutation that:
  1. Creates/links output item in `item_details`
  2. Inserts `assemblies` record
  3. Inserts `assembly_components` records
  4. Depletes component inventory (FIFO: reduces `quantity_remaining` on oldest `purchase_items`, updates `inventory.quantity_on_hand`)
  5. Adds output item to warehouse inventory
  6. Creates ledger entries for both consumption and production
  7. Sets `final_unit_cost` = (component total + labor) / output quantity

**Routing & Navigation:**
- Add route `/warehouse/assembly/new` in `App.tsx`
- Add "New Assembly" button on `Warehouse.tsx` page header

### Files Created
- `src/pages/NewAssembly.tsx`
- `src/hooks/useAssemblies.tsx`
- `src/hooks/useItemTypes.tsx`
- New migration SQL (item_types, assemblies, assembly_components)

### Files Modified
- `src/App.tsx` (add route)
- `src/pages/Warehouse.tsx` (add button)
- `src/pages/NewPurchase.tsx` (Item Type combobox, SKU fix, renames)
- `src/pages/PurchaseDetail.tsx` (renames, per-item cost section, auto-calc on arrived)
- `src/hooks/usePurchases.tsx` (cost calc at creation, local auto-arrived, item_type_id support)

---

## Technical Details Summary

```text
Database Changes:
  ┌─────────────────┐     ┌──────────────────────┐
  │   item_types     │◄────│ item_details          │
  │ id, name         │     │ + item_type_id (new)  │
  └─────────────────┘     └──────────────────────┘

  ┌─────────────────┐     ┌──────────────────────┐
  │   assemblies     │◄────│ assembly_components   │
  │ id, number,      │     │ id, assembly_id,      │
  │ output_item_id,  │     │ item_detail_id,       │
  │ output_qty,      │     │ qty_per_unit,         │
  │ labor, cost      │     │ total_qty, cost       │
  └─────────────────┘     └──────────────────────┘

Files Created (4):
  - src/hooks/useItemTypes.tsx
  - src/hooks/useAssemblies.tsx  
  - src/pages/NewAssembly.tsx
  - Migration SQL

Files Modified (5):
  - src/pages/NewPurchase.tsx
  - src/pages/PurchaseDetail.tsx
  - src/hooks/usePurchases.tsx
  - src/pages/Warehouse.tsx
  - src/App.tsx
```

### Execution Order
1. Database migration first (item_types + seed + backfill, assemblies tables)
2. Hooks (useItemTypes, useAssemblies)
3. Purchase fixes (cost calc, SKU, renames, auto-arrived for local)
4. PurchaseDetail fixes (renames, per-item cost section, auto-calc on arrived)
5. Assembly page + Warehouse button + routing

