

# Visit Report Detail Page Redesign

## Overview
A comprehensive redesign of the Visit Detail page (`/visits/:id`) to show complete slot-level audit data, profitability analytics, and a responsive card-based layout that works well on both desktop and mobile without horizontal scrolling.

## Current Problems
- Missing columns: last stock, current stock, audited count, false coins, jam status, surplus/shortage
- "Meter" column name is confusing -- it actually stores the audited physical count (often null)
- "Action" column should match Visit Type naming
- Wide table requires horizontal scrolling on mobile
- Status badge has no color differentiation
- No profitability analytics or rent cost context
- No days-since-last-visit indicator
- Swap events not clearly visible

## Database Migration Required

Two columns are missing from `visit_line_items` and need to be added to persist data that's currently captured in the form but discarded on submission:

- `false_coins` (integer, default 0) -- number of false coins found
- `jam_status` (text, default 'no_jam') -- jam type recorded during visit

The edge function also needs updating to save these two new fields.

## Plan

### 1. Database Migration: Add missing columns to visit_line_items

Add `false_coins` (integer, default 0) and `jam_status` (text, default 'no_jam') to the `visit_line_items` table so this data is persisted from now on.

### 2. Update Edge Function (submit-visit-report)

- Include `false_coins` and `jam_status` in the `SlotPayload` interface
- Store them in the `visit_line_items` insert

### 3. Redesign the Slot Activity Section as Card-Based List

Replace the wide table with a **stacked card list** (one card per slot). Each card shows:

```
[Machine AA-01 | Slot #1]  [Visit Type Badge]
Product: Pokemon           [Swapped badge if applicable]
--------------------------------------------------
Last Stock    | Current Stock | Audited  | Fill %
    150       |     131       |   --     |  73%
--------------------------------------------------
Added | Removed | False Coins | Jam Status
  80  |    5    |     0       | No Jam
--------------------------------------------------
Sales (units): 91   |  Surplus/Shortage: --
```

Key layout decisions:
- 2-column grid on desktop, single column on mobile
- Fill percentage shown as a mini progress bar
- Surplus/Shortage = `audited_count - current_stock` (only shown if audited count exists)
- Visit Type badge (e.g., "Routine Service", "Installation") replaces the old "Action" column
- Swap events get a prominent colored badge with the previous product name

### 4. Colored Status Badges

- **Completed**: Green background (`bg-green-500/20 text-green-700`)
- **Reversed**: Red/destructive background (already done)
- **Flagged**: Yellow/amber background (`bg-yellow-500/20 text-yellow-700`)

### 5. Enhanced Summary Cards Row

Expand the top summary section from 4 to include additional context:

**Row 1 (existing, enhanced)**:
- Date (with visit type label)
- Operator
- Cash Collected
- Status (with proper colors)

**Row 2 (new analytics)**:
- Days Since Last Visit (color-coded: green < 15, yellow 15-30, red > 30)
- Monthly Rent Cost (from location data)
- Rent Cost Since Last Visit (rent_amount / 30 x days_since_last_visit)
- Net Profit This Visit (cash_collected - rent_since_last_visit)

This requires fetching the **previous visit** for this spot and the **location's rent_amount**.

### 6. Profitability Mini-Analysis Card

A dedicated card below the summary showing:
- Revenue this visit: $250.00
- Rent accrued since last visit: $X.XX (daily rent x days)
- Gross profit: Revenue - Rent
- A simple colored indicator (green = profitable, red = loss)
- Total units added vs removed

### 7. Maintenance Tickets Section (always visible)

Show the maintenance section always, with:
- If tickets exist: display them with colored priority badges (already implemented)
- If no tickets: show a small "No maintenance issues reported" message
- This gives clear visibility into whether the visit flagged any problems

### 8. Data Fetching Updates

Update the visit detail query to also fetch:
- `locations.rent_amount`, `locations.negotiation_type`, `locations.commission_percentage` (via spot -> location join, already partially there)
- Previous completed visit for the same spot (to calculate days between visits)
- Current `machine_slots.current_stock` and `machine_slots.capacity` for fill percentage

### 9. Query Updates for Slot Snapshots

Combine `visit_line_items` + `visit_slot_snapshots` to derive per-slot:
- **Last Stock** = `snapshot.previous_stock`
- **Current Stock** = `previous_stock - quantity_removed + quantity_added`
- **Audited Count** = `meter_reading` (renamed from "Meter")
- **Fill %** = `current_stock / snapshot.previous_capacity * 100`
- **Surplus/Shortage** = `audited_count - current_stock` (when audited_count exists)
- **False Coins** = from `visit_line_items.false_coins` (new column)
- **Jam Status** = from `visit_line_items.jam_status` (new column)
- **Swapped** = when `snapshot.previous_product_id !== line_item.product_id`

## Technical Details

### Files to modify:
1. **New migration SQL** -- add `false_coins` and `jam_status` to `visit_line_items`
2. **`supabase/functions/submit-visit-report/index.ts`** -- persist `false_coins` and `jam_status`
3. **`src/pages/VisitDetail.tsx`** -- complete rewrite of the page layout with card-based slots, analytics, and responsive design
4. **`src/integrations/supabase/types.ts`** -- will auto-update after migration

### Data flow:
- Visit query already joins spot -> location (just need to add `rent_amount` to the select)
- Add a query for the previous visit date for the same spot
- Merge `visit_line_items` with `visit_slot_snapshots` by `slot_id` for the before/after data
- Compute profitability client-side from rent and cash data

