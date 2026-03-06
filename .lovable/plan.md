

## Plan: Fix Inventory Ledger Calculations, Labels, and Discrepancy Breakdown

### Root Cause Analysis

The edge function (`submit-visit-report/index.ts`, lines 531-547) records a **single net slot ledger entry** for non-swap visits:

```
slotQtyChange = currentStock - lastStock
```

This collapses all operations (sales, refills, removals, false coins, jams) into one number. For example:
- Feb 23: sold=50, added=25, removed=30, false=5 → net = -60 → recorded as one "removal" of -60
- This is mathematically correct as a net, but the user expects separate line items for sales, refills, and removals

Additionally, the swap flow (line 441) uses the note "Old product removed during swap" instead of "Product Sales before swap".

### Changes Required

#### 1. Edge Function: Split Slot Ledger into Separate Entries

**File**: `supabase/functions/submit-visit-report/index.ts` (lines 528-589)

Replace the single net `slotQtyChange` entry with up to 4 separate entries:

1. **Sale entry** (`movement_type: "sale"`, `reference_type: "visit"`): quantity = `-(unitsSold + falseCoins)`. Notes: `Units sold — {toyName}`. Only if `unitsSold + falseCoins > 0`.
2. **Refill entry** (`movement_type: "refill"`): quantity = `+unitsRefilled`. Notes: `Refill — {toyName}`. Only if `unitsRefilled > 0`.
3. **Removal entry** (`movement_type: "removal"`): quantity = `-unitsRemoved`. Notes: `Units removed — {toyName}`. Only if `unitsRemoved > 0`. (Note: this is a slot-side removal, negative qty leaving the slot)
4. **Jam adjustment** (`movement_type: "adjustment"`): quantity = `+1`. Notes: `Jam (+1 coin) — {toyName}`. Only if `jamStatus === "by_coin"`.

Each entry must calculate its own `running_balance` incrementally from the previous balance.

The warehouse-side entries (refill deduction at line 552, removal return at line 574) remain unchanged — they are already separate and correct.

#### 2. Edge Function: Add "sale" to Reference Type Constraint

**Migration**: Add `'sale'` to the `inventory_ledger_reference_type_check` constraint (already partially done, but `movement_type` for sale entries also needs to be valid).

Actually, the constraint is on `reference_type`, not `movement_type`. The `movement_type` column has no check constraint. But we need a migration to add `'sale'` to the `reference_type` check if it isn't already there.

**Migration SQL**:
```sql
ALTER TABLE public.inventory_ledger DROP CONSTRAINT IF EXISTS inventory_ledger_reference_type_check;
ALTER TABLE public.inventory_ledger ADD CONSTRAINT inventory_ledger_reference_type_check 
CHECK (reference_type = ANY (ARRAY['visit','purchase','manual','backfill','assembly','discrepancy','sale']));
```

#### 3. Edge Function: Fix Swap Out Notes

**File**: `supabase/functions/submit-visit-report/index.ts` (line 441)

Change: `"Old product removed during swap — {toyName}"` → `"Product Sales before swap — {toyName}"`

Also change the swap_out slot ledger entry (lines 432-443) to record sales separately from the swap removal, similar to the normal flow split above. The swap flow should record:
- A `sale` entry for `unitsSold + falseCoins` (negative, leaving the slot)
- A `swap_out` entry for the remaining stock removed from the slot (negative)

#### 4. UI: Add "sale" Movement Type Styling

**File**: `src/pages/ItemDetail.tsx` (line 44-56, `movementColors`)

Add: `sale: "bg-chart-2/10 text-chart-2 border-chart-2/20"` (green-tinted, since it represents revenue)

#### 5. UI: Categorize "sale" in Out Column

**File**: `src/pages/ItemDetail.tsx` (lines 1111-1124)

Update the `isOut` logic to include `movement_type === "sale"`:
```
const isOut = (entry.slot_id && entry.quantity < 0)
  || (entry.movement_type === "adjustment" && entry.quantity < 0)
  || entry.movement_type === "sale";
```

#### 6. Discrepancy Breakdown: Add Jam Count

**File**: `src/pages/ItemDetail.tsx` (lines 838-883)

- Calculate `totalJams` from `salesData` where `jam_status === "by_coin"`.
- Add a line in the breakdown between "False Coins" and "Expected": `+ Jams (coin) | +{totalJams}` (green, since jams add stock back).
- Update the expected formula: `expectedStock = totalReceived - totalUnitsSold - totalFalseCoins + totalJams`.
- Add a note below the discrepancy value: "Includes {totalJams} coin jam(s) that added stock without dispensing."

### Files to Modify

1. `supabase/functions/submit-visit-report/index.ts` — Split single net slot entry into separate sale/refill/removal/jam entries; fix swap notes
2. `src/pages/ItemDetail.tsx` — Add "sale" to movement colors; update Out categorization; add jam count to discrepancy breakdown
3. New migration — Add `'sale'` to `reference_type` check constraint

### Important Note

These changes only affect **future** visit reports. Existing ledger entries from prior visits will retain their old format (single net "removal" entries). The user may want to run a backfill to split historical entries, but that is a separate task.

