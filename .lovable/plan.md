

## Plan: Two-Phase Swap Workflow, Surplus/Shortage Tracking, and Auto-Resolve Jam Tickets

### Problem Summary

The "Replace all toys in this slot" feature currently mixes old product closure and new product setup into one flat form. This means:
1. The old product's final movements (units sold, removed, false coins, jam) are not properly captured
2. No surplus/shortage calculation for the old product
3. The new product setup lacks installation-style fields (capacity, price)
4. Jams are not auto-reported as maintenance tickets that get auto-resolved

### Solution Overview

Split the swap into two visual phases within the same slot card, add surplus/shortage for routine visits, and auto-create+resolve jam maintenance tickets.

---

### 1. SlotEntry Data Model Changes (`NewVisitReport.tsx`)

Add new fields to the `SlotEntry` interface for the two-phase swap:

```typescript
interface SlotEntry {
  // ... existing fields ...
  
  // Phase 2: New product fields (for swap)
  newToyId: string;
  newToyName: string;
  newToyCapacity: number;
  newUnitsRefilled: number;
  newPricePerUnit: number;
  newCurrentStock: number;  // = newUnitsRefilled
}
```

Currently, when `replaceAllToys` is toggled, the `toyId` is overwritten with the new product. Instead:
- `toyId` / `toyName` remain as the **old** product (original slot product)
- `newToyId` / `newToyName` store the **new** replacement product
- On submission, the payload sends both sets of data

### 2. UI: Two-Phase Swap Card Layout (`NewVisitReport.tsx`)

When `replaceAllToys` is checked, the slot card splits into two sections:

**Phase 1 — "Closing Out: [Old Product Name]"** (bordered section, slightly muted background):
```
Last Stock:      30        (read-only, from slot.lastStock)
Units Sold:      [input]
Units Removed:   [input]   (auto-set to remaining stock after sold/false/jam)
False Coins:     [input]
Price/Unit:      $1.00     (read-only)
Jam Status:      [select]
Current Stock:   0         (computed, should reach 0 for a swap)
Surplus/Shortage: +5       (auto: lastStock - unitsSold - unitsRemoved - falseCoins + jamAdj)
```

The surplus/shortage is computed as: `currentStock` should be 0 (all units accounted for). The variance = `lastStock - unitsSold - unitsRemoved - falseCoins + jamByConAdj`. If the operator doesn't account for all units, the system flags it.

**Phase 2 — "New Product Setup"** (bordered section, primary accent):
```
Assign Toy:      [ToyPicker combobox]
Toy Capacity:    [input, default 150]
Units Refilled:  [input]
Price/Unit ($):  [input, default 1.00]
Current Stock:   0         (= unitsRefilled)
Capacity:        0 / 150   [progress bar]
```

This is essentially the installation layout for the new product only.

### 3. Stock Calculation Changes (`updateSlot`)

When `replaceAllToys` is true:
- **Old product currentStock**: `lastStock - unitsSold + jamAdj - falseCoins - unitsRemoved` (should reach 0)
- **Surplus/Shortage**: computed as `currentStock` (anything left over is a surplus, negative is shortage)
- **New product currentStock**: `newUnitsRefilled`
- **cashCollected**: based on old product's `(unitsSold + jamAdj) * pricePerUnit`

The field sent to the edge function as `currentStock` becomes `newCurrentStock` (the new product's stock level that the machine slot will be set to).

### 4. Edge Function Payload Changes (`submit-visit-report/index.ts`)

Add fields to `SlotPayload`:
```typescript
interface SlotPayload {
  // ... existing ...
  newToyId: string;         // new product ID (swap only)
  newToyName: string;       // new product name
  newToyCapacity: number;   // new capacity
  newUnitsRefilled: number; // units loaded of new product
  newPricePerUnit: number;  // coin acceptor for new product
  newCurrentStock: number;  // = newUnitsRefilled
  swapSurplusShortage: number; // surplus/shortage of old product
}
```

### 5. Edge Function Logic Changes (`submit-visit-report/index.ts`)

For swap slots (`replaceAllToys === true`):

**Step 3 (visit_line_items)**: The line item records the swap action with `product_id` = new product, but we also need to store old product data. Since the schema has a single `product_id`, we'll use the new product as the primary and record old product movements via the snapshot and ledger.

**Step 4 (machine_slots update)**: Set `current_product_id` to `newToyId`, `current_stock` to `newCurrentStock`, `capacity` to `newToyCapacity`, `coin_acceptor` to `newPricePerUnit`.

**Step 5 (Inventory Ledger)**:
- **Old product slot ledger**: Record removal of all old stock from slot (quantity = `-previousStock`, balance = 0, movement_type = `swap_out`)
- **Old product warehouse ledger**: Return `unitsRemoved` to warehouse (the actual physical units returned)
- **Old product surplus/shortage**: If `swapSurplusShortage !== 0`, record an `adjustment` entry in both ledger and `inventory_adjustments`
- **New product warehouse ledger**: Deduct `newUnitsRefilled` from warehouse (movement_type = `refill`)
- **New product slot ledger**: Record addition of new stock to slot (quantity = `newCurrentStock`, balance = `newCurrentStock`, movement_type = `swap_in`)

**Step 6 (inventory_adjustments)**: For swaps, create adjustment records when surplus/shortage is non-zero (not just for audit visits).

**Step 7 (Maintenance - Jam Auto-Tickets)**: For ANY jam status that is not `no_jam`:
- Auto-create a maintenance ticket with `issue_type: "Jam"`, description auto-generated from jam type
- Immediately set `status: "resolved"` and `resolved_at: now()` since the operator addressed it during the visit
- This creates an audit trail of jams without requiring manual follow-up

### 6. Surplus/Shortage for Regular Routine Visits

Even for non-swap routine visits, we should track expected vs actual. Currently the system only does this for `inventory_audit` visits. The user wants surplus/shortage visible in the swap flow specifically.

For the swap, the surplus/shortage is simply: the old product's `currentStock` after accounting for all movements. If it's not 0, something is unaccounted for. We'll display this in the UI and record it in `inventory_adjustments`.

### 7. Machine Detail Page — Jam Display

The machine detail page already shows maintenance tickets per slot via the Maintenance tab. Since we're now auto-creating jam tickets (with `resolved` status), they'll automatically appear in the maintenance tab filtered per slot. No additional changes needed to `MachineDetail.tsx` for this — the existing query on `maintenance_tickets` already captures them.

### 8. Submission Payload Mapping

In `handleSubmit` / `submitVisitReport.mutate()`, update the slot mapping to include the new fields:
```typescript
slots: slots.map(s => ({
  // ... existing fields ...
  // For swap: toyId stays as OLD product, newToyId is the replacement
  toyId: s.replaceAllToys ? s.toyId : s.toyId,  // old product for swap
  newToyId: s.newToyId || "",
  newToyName: s.newToyName || "",
  newToyCapacity: s.newToyCapacity || 150,
  newUnitsRefilled: s.newUnitsRefilled || 0,
  newPricePerUnit: s.newPricePerUnit || 1,
  newCurrentStock: s.newCurrentStock || 0,
  swapSurplusShortage: s.replaceAllToys ? s.currentStock : 0,
  // currentStock for non-swap stays as computed; for swap, edge fn uses newCurrentStock
}))
```

### Files to Modify

1. **`src/pages/NewVisitReport.tsx`** — SlotEntry interface, updateSlot logic, renderSlotCard two-phase UI, submission payload
2. **`supabase/functions/submit-visit-report/index.ts`** — SlotPayload interface, swap logic in Steps 3-7, jam auto-ticket creation

### Technical Details

- The `inventory_ledger` check constraint allows: `receive`, `refill`, `removal`, `swap_in`, `swap_out`, `reversal`, `adjustment`, `transfer`, `initial`, `assembly_consumption`, `assembly_production` — all needed types are covered
- The `visit_action_type` enum allows: `restock`, `collection`, `service`, `swap` — the `swap` type is available
- The `inventory_adjustments` table can store surplus/shortage records with `visit_id`, `item_detail_id`, `slot_id`
- The `maintenance_tickets` table has `status` enum that includes `resolved` and `resolved_at` column
- No database migrations needed — all required tables and columns already exist

