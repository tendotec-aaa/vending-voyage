

## Route Audit & Refill Reconciliation — with Under-fill Warning Flag

### Overview

Add a "Reconciliation" tab to the existing `/routes/:id` page. This requires a DB migration to link visits to routes, updates to the visit submission flow to tag the route, and a new reconciliation UI with accuracy scoring and under-fill warnings.

---

### Step 1: Database Migration

```sql
-- Link visits to routes
ALTER TABLE spot_visits ADD COLUMN route_id uuid REFERENCES routes(id);

-- Track route completion metadata
ALTER TABLE routes ADD COLUMN completed_at timestamptz;
ALTER TABLE routes ADD COLUMN auto_completed boolean DEFAULT false;
```

Update `src/integrations/supabase/types.ts` to reflect these new columns.

---

### Step 2: Tag Route on Visit Submission

**`src/pages/OperatorDashboard.tsx`**: Pass `route_id` as a URL param when navigating to `/visits/new`.

**`src/pages/NewVisitReport.tsx`**: Read `route_id` from URL search params, pass it to the edge function payload.

**`supabase/functions/submit-visit-report/index.ts`**: Accept `route_id` in `VisitPayload`, include it in the `spot_visits` insert.

---

### Step 3: Reconciliation Tab in RouteDetail

**File**: `src/pages/RouteDetail.tsx` — add a third tab "Reconciliation" (visible to admin/accountant).

**New query** (`useQuery`): Fetch `spot_visits` where `route_id = :id`, then fetch their `visit_line_items` with product/slot joins.

**Fallback for pre-migration routes**: Match visits by spot_id (spots within route locations) + `visit_date` within ±1 day of `scheduled_for`.

#### Reconciliation Table (per location/spot)

| Column | Source |
|--------|--------|
| Item Name & Slot | `visit_line_items.product` + `slot.slot_number` |
| System Suggested | `computeSlotRefill()` using velocity data at route creation time |
| Actual Refill | `visit_line_items.quantity_added` |
| Variance | `actual - suggested` |

#### Variance Highlighting
- **Red text**: If `abs(variance) / suggested > 0.20` (20% threshold)
- **Warning row highlight** (amber/orange background): If `actual < suggested` by more than 30% AND the `spot_visits.notes` is null/empty. This flags unexplained under-fills forcing a conversation about the discrepancy.

#### Operator Notes
Display `spot_visits.notes` inline below each spot's rows.

---

### Step 4: Accuracy Score & Status Badges

At the top of the Reconciliation tab:

- **Suggested Accuracy**: `(items where abs(variance)/suggested < 0.10) / total_items * 100`%
- **Route Status** badge (planned/in_progress/completed)
- **Completion Time**: `routes.completed_at` formatted
- **"System Verified"** badge: shown when `routes.auto_completed = true`

---

### Step 5: Update Route Interface

**`src/hooks/useRoutes.tsx`**: Add `completed_at` and `auto_completed` to the `Route` interface. Update the route detail query to select these fields.

---

### Files to Modify

| File | Change |
|------|--------|
| DB Migration | Add `route_id` to `spot_visits`, `completed_at` + `auto_completed` to `routes` |
| `src/integrations/supabase/types.ts` | Add new columns to types |
| `src/pages/OperatorDashboard.tsx` | Pass `route_id` in nav URL |
| `src/pages/NewVisitReport.tsx` | Read `route_id`, pass to edge function |
| `supabase/functions/submit-visit-report/index.ts` | Persist `route_id` on `spot_visits` insert |
| `src/hooks/useRoutes.tsx` | Update `Route` interface with new fields |
| `src/pages/RouteDetail.tsx` | Add Reconciliation tab with table, accuracy score, status badges, and under-fill warning rows |

---

### Under-fill Warning Rule (Addendum)

```
IF (actual < suggested * 0.70) AND (notes IS NULL OR notes = ''):
  → Highlight entire row with amber/warning background
  → Show ⚠️ icon with tooltip: "Significant under-fill with no explanation"
```

This creates accountability — operators must explain why they deviated significantly from the system suggestion, or the row gets flagged for admin review.

