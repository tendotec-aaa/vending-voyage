

# Fix Inventory Tracking: Single Source of Truth

## Problem Summary

The system currently has **two disconnected paths** for modifying stock:

1. **Stock Receiving** (`useReceiveStock.tsx`) -- updates `inventory.quantity_on_hand` directly but **never writes to `inventory_ledger`**
2. **Visit Reports** (`submit-visit-report` edge function) -- updates both `inventory` and `inventory_ledger`

This means the ledger is incomplete, the discrepancy formula uses wrong inputs (`quantity_ordered` instead of `quantity_received`), and there's no way to reconcile stock accurately.

## Solution: 3-Part Fix

### Part 1: Add Ledger Entries to Stock Receiving

Update `src/hooks/useReceiveStock.tsx` to write a `"receive"` entry to `inventory_ledger` for every warehouse allocation during stock receiving. Each entry records the quantity received and the new running balance.

This ensures every unit entering the system through purchases is tracked in the ledger.

### Part 2: Fix the Discrepancy Alert Formula

Update the discrepancy calculation in `src/pages/ItemDetail.tsx`:

**Current (wrong):**
```
Expected = quantity_ordered - units_sold
```

**Fixed:**
```
Expected = quantity_received - units_sold - false_coins + units_removed_back_to_warehouse
```

- Use `quantity_received` (not `quantity_ordered`) from `purchase_items`
- Subtract `false_coins` (lost units)  
- The `units_removed` from visits go back to the warehouse, so they don't reduce total stock -- but `units_sold` and `false_coins` do leave the system entirely

More precisely:
```
Total Received  = SUM(purchase_items.quantity_received)
Total Lost      = SUM(visit_line_items.units_sold) + SUM(visit_line_items.false_coins)  
Expected Stock  = Total Received - Total Lost
Actual Stock    = Warehouse Stock + Deployed Stock
Discrepancy     = Actual - Expected
```

### Part 3: Expandable Discrepancy Breakdown

Replace the simple alert text with a collapsible section that shows each component:

```
Stock Discrepancy Detected: Shortage of 102 units

[v] View Breakdown
  Total Received (from purchases)    12,600
  - Units Sold (from visits)           -171
  - False Coins (lost)                  -15
  ─────────────────────────────────────────
  Expected Stock                     12,414
  
  Actual Stock Breakdown:
    Warehouse                        11,905
    Deployed in Machines                422
  ─────────────────────────────────────────
  Actual Stock                       12,327
  
  Discrepancy                          -87
```

## Technical Details

### Files Modified

1. **`src/hooks/useReceiveStock.tsx`**
   - After each `upsertInventory()` call, insert a row into `inventory_ledger` with `movement_type: "receive"`, the quantity, and a running balance fetched from the current warehouse inventory
   - Also create ledger entries for discrepancy allocations to the Unaccounted warehouse

2. **`src/pages/ItemDetail.tsx`**
   - Change `totalAcquired` to use `quantity_received` instead of `quantity_ordered` (line 315-317)
   - Update the discrepancy computation (lines 491-510) to subtract both `units_sold` and `false_coins`
   - Add a `Collapsible` component around the alert to show the full breakdown
   - Import `Collapsible, CollapsibleTrigger, CollapsibleContent` from the UI library

### No Database Changes Required

The `inventory_ledger` table already exists with the correct schema. The fix is purely in application logic.

### Impact on Existing Data

- Existing ledger entries remain untouched
- Future stock receiving operations will create proper ledger trails
- The discrepancy formula will immediately show more accurate numbers using the corrected calculation
- Historical visits that pre-date the ledger will still lack entries, but the discrepancy alert will be accurate because it uses `purchase_items` and `visit_line_items` directly (not the ledger)

