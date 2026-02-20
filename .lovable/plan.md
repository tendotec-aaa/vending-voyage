

## Visit Report Enhancements: Auto-Type Detection + Rollback/Reversibility

### Overview

Two main changes:
1. **Auto-detect "Routine Service"** when slots already have stock/products assigned
2. **Visit rollback capability** — save a pre-visit snapshot of every machine slot so an admin can reverse a faulty report and restore inventory to exactly where it was before

---

### 1. Auto-Set Visit Type to "Routine Service"

Currently, the auto-detection logic (line ~287) only handles the "all empty" case (sets to Installation). When slots DO have products/stock, no visit type is set — the user must pick manually.

**Change**: In the same `useEffect`, add an `else` branch: if NOT all empty (i.e., at least one slot has a product or stock), auto-set `visitType` to `"routine_service"`. The user can still change it manually to Maintenance, Emergency, Inventory Audit, etc.

**File**: `src/pages/NewVisitReport.tsx` (the existing `useEffect` at line ~287)

---

### 2. Visit Rollback — Pre-Visit Snapshots

#### New Database Table: `visit_slot_snapshots`

A lightweight table that captures the state of each `machine_slot` **before** the visit modifies it. One row per slot per visit.

| Column | Type | Purpose |
|---|---|---|
| id | uuid (PK) | Row ID |
| visit_id | uuid (FK -> spot_visits) | Which visit this snapshot belongs to |
| slot_id | uuid (FK -> machine_slots) | Which slot was snapshotted |
| previous_product_id | uuid (nullable) | Product that was in the slot before the visit |
| previous_stock | integer | Stock level before the visit |
| previous_capacity | integer | Capacity before the visit |
| previous_coin_acceptor | numeric | Price per unit before the visit |
| created_at | timestamptz | When the snapshot was taken |

RLS: Authenticated users can read; only admins (or authenticated) can insert/delete.

#### Submission Flow Change

In the `submitVisitReport` mutation (after creating the `spot_visit` record but **before** updating `machine_slots`), insert one `visit_slot_snapshots` row per slot capturing:
- `previous_product_id` = the slot's `current_product_id` from the database
- `previous_stock` = `slot.lastStock` (the value loaded from the DB)
- `previous_capacity` = `slot.capacity`
- `previous_coin_acceptor` = `slot.pricePerUnit`

This is a simple bulk insert of the data already available in memory — no extra DB reads needed.

#### Rollback Functionality

A new function/mutation (in a hook or inline) that, given a `visit_id`:

1. Reads all `visit_slot_snapshots` for that visit
2. For each snapshot, restores the `machine_slots` row: sets `current_product_id`, `current_stock`, `capacity`, `coin_acceptor` back to the snapshot values
3. Deletes the `visit_line_items` for that visit
4. Updates the `spot_visits` record status to `"reversed"` (keeps the record for audit trail, never deletes it)
5. Deletes the snapshots (or keeps them, marked as used)

This is exposed as a "Reverse Visit" button on the Visits list page (admin-only), with an AlertDialog confirmation.

---

### 3. Jam Status "+1" Logic

The functional description mentions that "By Coin" jam status should add +1 to units sold (a coin was inserted but the unit may not have dispensed properly — it counts as a sale). This is already partially in the dropdown options but the calculation logic in `updateSlot` doesn't account for it.

**Change**: In the `updateSlot` function, when `jamStatus === "by_coin"`, add +1 to the effective units sold for the current stock calculation. Also append "(+1)" to the "By Coin" dropdown label.

---

### Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| Migration SQL | Create | New `visit_slot_snapshots` table |
| `src/pages/NewVisitReport.tsx` | Modify | (a) Auto-set "routine_service" when slots have items, (b) Save snapshots on submit, (c) Jam "+1" logic |
| `src/pages/Visits.tsx` | Modify | Add "Reverse" button per visit row (admin-only) with rollback logic |
| `src/integrations/supabase/types.ts` | Auto-updated | Reflects new table |

### Technical Details

**Migration SQL:**
```sql
CREATE TABLE public.visit_slot_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.spot_visits(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES public.machine_slots(id) ON DELETE CASCADE,
  previous_product_id uuid,
  previous_stock integer NOT NULL DEFAULT 0,
  previous_capacity integer NOT NULL DEFAULT 150,
  previous_coin_acceptor numeric NOT NULL DEFAULT 1.00,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visit_slot_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON public.visit_slot_snapshots
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated" ON public.visit_slot_snapshots
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated" ON public.visit_slot_snapshots
  FOR DELETE USING (auth.role() = 'authenticated');
```

**Snapshot insert (in submitVisitReport, before machine_slots update):**
```typescript
const snapshots = slots.map(slot => ({
  visit_id: visitData.id,
  slot_id: slot.slotId,
  previous_product_id: slot.toyId || null,
  previous_stock: slot.lastStock,
  previous_capacity: slot.capacity,
  previous_coin_acceptor: slot.pricePerUnit,
}));
await supabase.from('visit_slot_snapshots').insert(snapshots);
```

**Rollback logic (on Visits page):**
```typescript
// 1. Fetch snapshots
const { data: snapshots } = await supabase
  .from('visit_slot_snapshots')
  .select('*')
  .eq('visit_id', visitId);

// 2. Restore each slot
for (const snap of snapshots) {
  await supabase.from('machine_slots').update({
    current_product_id: snap.previous_product_id,
    current_stock: snap.previous_stock,
    capacity: snap.previous_capacity,
    coin_acceptor: snap.previous_coin_acceptor,
  }).eq('id', snap.slot_id);
}

// 3. Mark visit as reversed
await supabase.from('spot_visits')
  .update({ status: 'reversed' })
  .eq('id', visitId);
```

**Auto-detect routine_service:**
```typescript
// In existing useEffect after the allEmpty check:
if (allEmpty) {
  setVisitType('installation');
  // ... existing contract date logic
} else {
  setVisitType('routine_service');
}
```

**Jam "+1" in updateSlot:**
```typescript
// When calculating currentStock for non-installation, non-audit:
const jamAdjustment = updated.jamStatus === 'by_coin' ? 1 : 0;
updated.currentStock = updated.lastStock - (updated.unitsSold + jamAdjustment) + updated.unitsRefilled - updated.unitsRemoved;
updated.cashCollected = (updated.unitsSold + jamAdjustment) * updated.pricePerUnit;
```

And in the dropdown label: `{ id: "by_coin", name: "By Coin (+1)" }`

