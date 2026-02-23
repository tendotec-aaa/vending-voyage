

## Gold Standard Visit Report: Implementation Plan

### Current State vs. Blueprint

| # | Feature | Status | Work Required |
|---|---------|--------|---------------|
| 1 | Atomic Transaction | Not done | Wrap submission in edge function with DB transaction |
| 2 | Connected Inventory Ledger | Not done | Deduct warehouse stock on refill, return removed stock |
| 3 | Financial Integrity Trail (Shortage/Surplus) | Partial | Audit view exists but no permanent shortage/surplus records |
| 4 | Evidence Lock (Swap Photo) | Not done | Require photo upload when "Replace all toys" is checked |
| 5 | Smart-Restock Guidance | Not done | Calculate suggested load per slot based on sales velocity |
| 6 | Automatic Maintenance Loop | Not done | Auto-create maintenance tickets from flagged issues |
| 7 | Instant Performance Grade | Not done | Post-submission score card |
| 8 | Snapshot Safety Net | Done | visit_slot_snapshots + rollback already implemented |

---

### Implementation Details

#### 1. Atomic Transaction (Edge Function)

Move the entire submission logic from the frontend into a single Supabase Edge Function called `submit-visit-report`. This function will use a PostgreSQL transaction so that if any step fails, nothing is saved.

**New file:** `supabase/functions/submit-visit-report/index.ts`

The frontend will send one payload containing all slot data, visit metadata, and observation notes. The edge function will:
- Begin a database transaction
- Insert `spot_visits` record
- Insert `visit_slot_snapshots` (pre-visit state)
- Insert `visit_line_items` for each slot
- Update `machine_slots` with new stock/product
- Deduct warehouse inventory for refills (Feature 2)
- Route removed stock back to warehouse (Feature 2)
- Log shortage/surplus records for audits (Feature 3)
- Create maintenance tickets for flagged issues (Feature 6)
- Commit transaction (or rollback entirely on any failure)

The frontend `submitVisitReport` mutation will change from multiple Supabase calls to a single `supabase.functions.invoke('submit-visit-report', { body: payload })`.

#### 2. Connected Inventory Ledger

Inside the edge function transaction:

**On Refill (`unitsRefilled > 0`):**
- Find the inventory row for this product in the source warehouse (initially, we use the first non-system warehouse; later this can be operator-specific)
- Subtract `unitsRefilled` from `inventory.quantity_on_hand`
- If insufficient warehouse stock, still allow submission but flag a warning in the response

**On Removal (`unitsRemoved > 0`):**
- Add `unitsRemoved` back to the source warehouse's inventory row for that product
- If no inventory row exists, create one

**On Product Swap (`replaceAllToys === true`):**
- The old product's remaining stock (`lastStock - unitsSold`) is returned to warehouse inventory
- The new product's refilled quantity is deducted from warehouse inventory

No new tables needed -- uses the existing `inventory` table with its `(item_detail_id, warehouse_id)` composite constraint.

#### 3. Financial Integrity Trail

**New table:** `inventory_adjustments`

| Column | Type | Purpose |
|---|---|---|
| id | uuid PK | Row ID |
| visit_id | uuid FK -> spot_visits | Which visit triggered this |
| item_detail_id | uuid FK -> item_details | Which product |
| slot_id | uuid FK -> machine_slots | Which slot |
| adjustment_type | text | 'shortage' or 'surplus' |
| expected_quantity | integer | What the system calculated |
| actual_quantity | integer | What the technician physically counted |
| difference | integer | actual - expected (negative = shortage) |
| created_at | timestamptz | Timestamp |

During audit submissions, when `auditedCount` differs from the calculated stock, the edge function inserts a row into this table. The `machine_slots.current_stock` is set to the audited count (accepting physical reality), but the discrepancy is permanently recorded.

This table can later power dashboards showing shrinkage patterns by location, product, or operator.

#### 4. Evidence Lock for Product Swaps

**Frontend change in `NewVisitReport.tsx`:**

When `replaceAllToys` is checked and the technician selects a new product:
- Show a mandatory photo upload area for that specific slot
- The photo is uploaded to the existing `item-photos` storage bucket with a path like `swap-evidence/{visit_id}/{slot_id}.jpg`
- The photo URL is included in the submission payload
- Store the URL in `visit_line_items` -- requires adding a `photo_url` column to `visit_line_items`

**Validation:** The Submit button is disabled if any slot with `replaceAllToys === true` and a new product selected has no photo uploaded.

**Migration:** Add `photo_url text` column to `visit_line_items`.

#### 5. Smart-Restock Guidance

**Frontend change in `NewVisitReport.tsx`:**

After slots are loaded, calculate a "Suggested Load" per slot:
- Query the last N visits' line items for this spot to get average daily sales rate per slot
- Formula: `suggestedRefill = Math.ceil(salesRate * targetDays) - currentStock`
- Where `targetDays` could default to 14 (two weeks of stock)

Display as a subtle hint below the "Units Refilled" input:
```
Suggested: ~45 units (based on 3.2/day avg)
```

This is purely a frontend calculation using data already available (last visit date + units sold history). A new query fetches the last 5 visits' line items for the selected spot to compute the average.

No database changes needed.

#### 6. Automatic Maintenance Loop

Inside the edge function transaction, after processing all slots:

For each slot where `reportIssue === true`:
- Insert a row into `maintenance_tickets` with:
  - `location_id`: from the spot's parent location
  - `spot_id`: the current spot
  - `machine_id`: the slot's machine
  - `slot_id`: the slot ID
  - `issue_type`: "Field Report"
  - `description`: the technician's issue description
  - `priority`: mapped from severity (low/medium/high)
  - `reporter_id`: the operator's user ID
  - `visit_id`: the visit record ID
  - `product_id`: current product in the slot
  - `setup_id`: the setup ID
  - `status`: "pending"

Also for observation-level issues (`hasObservationIssue === true`):
- Create one maintenance ticket for the general observation, linked to the spot but not a specific slot

No new tables needed -- uses the existing `maintenance_tickets` table which already has all the required columns including `visit_id`, `machine_id`, `slot_id`, `setup_id`, and `product_id`.

#### 7. Instant Performance Grade

**Frontend change in `NewVisitReport.tsx`:**

After successful submission, instead of immediately navigating away, show a modal/dialog with a "Visit Summary" scorecard:

- Total cash collected this visit
- Comparison to the average cash collected at this spot (from past visits)
- A simple grade: Star rating or color (Green = above average, Yellow = average, Red = below average)
- Number of slots serviced
- Any issues flagged count
- A "Done" button to navigate to the visits list

The comparison data comes from the existing `spot_visits` table -- average `total_cash_collected` for this spot over the last 10 visits.

No database changes needed.

---

### Database Changes Summary

**New table:**
- `inventory_adjustments` (for shortage/surplus audit trail)

**Modified table:**
- `visit_line_items`: add `photo_url text` column

**New edge function:**
- `submit-visit-report` (atomic transaction handler)

### Frontend Changes Summary

**Modified file:** `src/pages/NewVisitReport.tsx`
- Smart-restock suggestion display per slot
- Mandatory photo upload UI for product swaps
- Photo upload to storage bucket
- Post-submission performance grade modal
- Submission now calls edge function instead of direct DB calls
- Payload includes all data for the edge function

### Execution Order

1. Create `inventory_adjustments` table migration
2. Add `photo_url` column to `visit_line_items` migration
3. Create `submit-visit-report` edge function (Features 1, 2, 3, 6)
4. Update `NewVisitReport.tsx` (Features 4, 5, 7 + call edge function)

### What Already Works (No Changes Needed)

- Snapshot safety net (Feature 8) -- already saving `visit_slot_snapshots` and rollback works from the Visits page
- Auto-detection of visit type (installation vs routine service)
- Jam status "+1" logic for "By Coin" jams
- Audit view with surplus/shortage display in the UI
- 30-day visit warning dialog

