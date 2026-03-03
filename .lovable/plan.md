## Plan: Fix Surplus/Shortage, Swap Handling, Ledger Enhancements & Stock Discrepancy Management

This is a large, multi-part change touching the edge function, frontend report pages, and database schema. Here is the breakdown:

---

### 1. Fix Surplus/Shortage Inversion

**Root cause**: In the swap flow (NewVisitReport.tsx line 666), `swapSurplusShortage = updated.currentStock`. The `currentStock` after a swap represents leftover units. Positive means extra units remain (surplus), negative means units are missing (shortage). However, the sign convention is inverted relative to what you expect.

**Fix**:

- **NewVisitReport.tsx**: Negate the value: `swapSurplusShortage = -updated.currentStock`. This way, if `currentStock = 5` (5 units unaccounted for that should have been sold/removed), it becomes -5 (shortage). If `currentStock = -3` (more sold than expected), it becomes +3 (surplus).
- **Edge function** (submit-visit-report): The `adjustment_type` label logic at line 442 (`s.swapSurplusShortage > 0 ? "surplus" : "shortage"`) stays correct since the sign is now fixed at the source.
- **Audit flow** (edge function lines 559-570): Verify `diff = auditedCount - expected`. If `auditedCount < expected`, diff is negative → "shortage". This is correct as-is.
- **ItemDetail.tsx discrepancy** (line 657): `diff = totalStock - expectedStock`. If actual < expected, diff < 0 → shortage. Label and color on line 663/706-708 are correct.

### 2. Fix Swap Handling — Two Separate Database Entries

**Current problem**: A swap creates ONE `visit_line_items` row with the new product ID, merging old-product sales data with new-product refill data into a single record.

**Fix in edge function** (`submit-visit-report/index.ts`):

- For swap slots, insert **two** `visit_line_items` rows:
  1. **Old product row**: `product_id = oldProductId`, `action_type = "swap_out"`, `quantity_added = 0`, `quantity_removed = unitsRemoved`, `units_sold = unitsSold`, `computed_current_stock = 0`, `cash_collected`, `false_coins`, `jam_status`, `meter_reading = auditedCount`, `photo_url`
  2. **New product row**: `product_id = newProductId`, `action_type = "swap_in"`, `quantity_added = newUnitsRefilled`, `quantity_removed = 0`, `units_sold = 0`, `computed_current_stock = newCurrentStock`, `cash_collected = 0`, `false_coins = 0`, `jam_status = "no_jam"`, `meter_reading = null`
- Current line 337-356 (single insert for all slots) must be refactored: build the array conditionally, pushing two entries for swap slots.

**Fix in NewVisitReport.tsx payload** (line 740-764): No change needed — the slot payload already carries all old + new product fields. The edge function just needs to split them into two rows.

### 3. Fix VisitDetail Swap Card Display

**Current problem**: Only one card per slot, even during swaps. Swap info is just a purple badge.

**Fix in VisitDetail.tsx** (`enrichedSlots` construction, lines 255-308):

- When `li.action_type === "swap_out"`, render a card for the **old product** showing: last stock, units sold, removed, cash collected, false coins, jam status, surplus/shortage.
- When `li.action_type === "swap_in"`, render a card for the **new product** showing: units refilled (added), new current stock, new capacity, fill %, and the swap photo.
- Group them visually with a connecting badge: "Swap Phase 1: Outgoing" and "Swap Phase 2: Incoming".
- Display `photo_url` from the swap_in line item on its card.

### 4. Enhance Inventory Ledger in ItemDetail.tsx

**Changes to ledger display** (lines 730-783):

- **Date column**: Show the visit date (from the linked `spot_visit.visit_date` via `reference_id`) instead of `created_at`. Add a join or secondary query to resolve `reference_id → spot_visits.visit_date` for ledger entries with `reference_type = "visit"`. For `reference_type = "purchase"`, show `purchases.received_at`.
- **Add columns**:
  - "Origin Date": The date the item was first purchased or assembled (from `purchase_items.purchase.created_at` or `assemblies.created_at`).
  - "Inward" column: Show quantity when positive.
  - "Outward" column: Show quantity when negative (as absolute value).
  - Running inward/outward totals at the bottom.

### 5. Create `stock_discrepancy` Table & Management UI

**New migration** — create `stock_discrepancy` table:

```sql
CREATE TABLE public.stock_discrepancy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_detail_id uuid NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  occurrence_date date NOT NULL DEFAULT CURRENT_DATE,
  discrepancy_type text NOT NULL DEFAULT 'system', -- 'system' or 'visual'
  expected_quantity integer NOT NULL,
  actual_quantity integer NOT NULL,
  difference integer NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'resolved'
  admin_note text,
  resolved_at timestamptz,
  resolved_by uuid,
  adjustment_id uuid, -- links to inventory_adjustments
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_discrepancy ENABLE ROW LEVEL SECURITY;
-- RLS policies for authenticated users
```

**ItemDetail.tsx changes** (discrepancy section, lines 653-718):

- Replace the static alert with a managed discrepancy section:
  - List all `stock_discrepancy` records for this item (pending + resolved).
  - Each pending discrepancy shows: date, expected vs actual, difference, and an **"Add Note & Resolve"** button (admin only).
  - Clicking "Resolve" opens a dialog where admin enters a note, selects the occurrence date, and the system:
    1. Creates an `inventory_adjustments` record.
    2. Creates a ledger entry for the adjustment.
    3. Updates the `stock_discrepancy` status to "resolved".
  - **"Report Visual Discrepancy"** button: Opens a dialog where the user selects occurrence date, enters a note, and the system:
    1. Creates a `stock_discrepancy` record with `discrepancy_type = 'visual'`.
    2. Sets the item's inventory to 0 across all warehouses.
    3. Creates ledger entries for each warehouse zeroing out.
    4. Does NOT auto-resolve — admin must still review and resolve.
- Each discrepancy is independent (50 units on Jan 15, 100 units on Mar 20 → two separate entries, two separate resolutions).

### Files to Modify

1. `src/pages/NewVisitReport.tsx` — Fix surplus/shortage sign inversion
2. `supabase/functions/submit-visit-report/index.ts` — Split swap into two `visit_line_items` rows; fix surplus/shortage labels
3. `src/pages/VisitDetail.tsx` — Render separate cards for swap_out/swap_in; show swap photos
4. `src/pages/ItemDetail.tsx` — Enhance ledger with date/inward/outward columns; add stock discrepancy management UI with resolve + visual report flows
5. **New migration**: Create `stock_discrepancy` table with RLS
6. `src/integrations/supabase/types.ts` — Will auto-update after migration

### Important Notes

- The swap fix changes how data is stored going forward. Existing swap records (single rows with `action_type = "swap"`) will continue to render as before via backward-compatible logic in VisitDetail.
- The `stock_discrepancy` table is separate from `inventory_adjustments` — discrepancies are the detection events, adjustments are the corrections.
- The ledger date enhancement requires a lightweight lookup: when rendering, resolve `reference_id` to a visit or purchase date. This will be done via a secondary query keyed on the set of unique reference IDs from ledger entries.