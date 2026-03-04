

## Plan: Ledger "Dep" Column, Visual Discrepancy Quantity Input, Swap Photo Fix & Cash Collected Jam Fix

### 1. Add "Dep" (Deployed) Column to Inventory Ledger

**File**: `src/pages/ItemDetail.tsx` (ledger section ~lines 1052-1111)

Currently the ledger shows In | Out | Bal. Add a "Dep" column between In and Out:

- **In** = positive quantity entries where `warehouse_id` is set (purchases, assemblies, returns to warehouse)
- **Dep** = entries where `slot_id` is set (deployed to/from machine slots). Positive = returned from slot, negative = sent to slot
- **Out** = negative quantity entries that are sales/adjustments (movement_type includes "sale", "adjustment", "swap_out" on slot, etc.)
- **Bal** = running balance (unchanged)

Logic per entry:
- If `entry.slot_id` is set → show quantity in Dep column (green if positive/return, red if negative/deploy)
- Else if `entry.quantity > 0` → show in In column
- Else if `entry.quantity < 0` → show in Out column

Update totals row to include Dep total.

### 2. Visual Discrepancy Dialog — Add Quantity Input

**File**: `src/pages/ItemDetail.tsx` (dialog ~lines 984-1016, handler ~lines 468-536)

- Add a state variable `visualQuantity` initialized to `totalStock` when dialog opens
- Add an `Input` field of type `number` in the dialog letting the user adjust the quantity to report
- Update `handleReportVisualDiscrepancy` to use `visualQuantity` instead of hardcoded `totalStock` for the `expected_quantity` and zeroing logic (set inventory to `totalStock - visualQuantity` instead of always 0, or if they report the full amount, zero it out)

### 3. Swap Photo on Incoming Card (Not Outgoing)

**File**: `src/pages/VisitDetail.tsx` (~lines 594-631)

Currently the `photoUrl` is stored on the `swap_out` line item (edge function line 351). Move the photo to the `swap_in` entry instead.

**Edge function fix** (`supabase/functions/submit-visit-report/index.ts`, lines 341-371):
- On the `swap_out` row: set `photo_url: null`
- On the `swap_in` row: set `photo_url: s.photoUrl`

**VisitDetail.tsx fix**:
- Remove the photo rendering block from the `isSwapOut` section (lines 594-604)
- Add photo rendering to the `isSwapIn` section (after line 630)

**Incoming badge color**: Make the Swap: Incoming badge more prominent — use a solid green background instead of the current subtle `bg-chart-2/20`.

### 4. Fix Cash Collected — Jam (+1 coin) Should NOT Add to Cash

**File**: `src/pages/NewVisitReport.tsx` (lines 676-677)

Current code:
```typescript
const jamAdj = updated.jamStatus === 'by_coin' ? 1 : 0;
updated.cashCollected = (updated.unitsSold + jamAdj) * updated.pricePerUnit;
```

The jam coin is already included in `unitsSold` (the machine counted it as a sale). The `+1` adjustment is only for stock tracking (the unit is stuck, not dispensed). Cash should NOT include the jam adjustment:

```typescript
updated.cashCollected = updated.unitsSold * updated.pricePerUnit;
```

The stock formula already correctly adds `jamAdjustment` to account for the stuck unit, so only the cash line needs fixing.

### Files to Modify

1. `src/pages/ItemDetail.tsx` — Add Dep column to ledger; add quantity input to visual discrepancy dialog
2. `src/pages/VisitDetail.tsx` — Move swap photo to incoming card; make incoming badge more prominent
3. `supabase/functions/submit-visit-report/index.ts` — Move `photo_url` from swap_out to swap_in row
4. `src/pages/NewVisitReport.tsx` — Remove jam adjustment from cash collected calculation

