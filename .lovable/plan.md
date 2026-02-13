
# Plan: New Visit Report Enhancements

## Summary
Fix critical data-saving bugs and enhance the New Visit Report page with setup info display, auto-detection of installation visits, days-since-last-visit indicator, capacity color coding, and a 30-day confirmation dialog.

---

## 1. Show Setup Info After Spot Selection

In the **Location Details** card, after the user selects a spot, display the setup assigned to that spot:
- Setup name, setup type badge (Single/Double/Triple/Quad/Custom)
- List of machines with serial numbers and their position labels

This uses the already-fetched `spotSetup` and `machines` queries.

---

## 2. Auto-Detect Installation Visit

After spot is selected and machine slots are loaded, check if **all slots** have no product assigned (`current_product_id === null`) and no stock (`current_stock === 0`).

If true (first day):
- Auto-select "Installation" as the visit type
- Auto-set the visit date to the location's `contract_start_date`
- Fetch the selected location's `contract_start_date` (already available from the `locations` query)

---

## 3. Days Since Last Visit Indicator

Add a "Days Since Last Visit" indicator to the **Visit Details** card:
- Query the most recent `spot_visits` record for the selected spot (ordered by `visit_date` desc, limit 1)
- Calculate days between today and the last visit date
- If installation (no prior visits): show "0" in green
- Color coding:
  - Less than 15 days: green background
  - 15-30 days: yellow/amber background
  - Greater than 30 days: red background

### 30-Day Warning Dialog
On submit, if days since last visit > 30, show an `AlertDialog` asking: "It has been over 30 days since the last visit to this spot. Are you sure the selected date is correct, or do you need to change it?"
- "Continue" proceeds with submission
- "Change Date" closes the dialog so the user can adjust

---

## 4. Capacity Indicator Color Coding

Replace the plain text capacity display with a colored progress-style indicator:
- **0-25% full**: Red (critically low)
- **26-50% full**: Yellow/amber (low)
- **51-75% full**: Blue (moderate)
- **76-100% full**: Green (healthy)

Show a small progress bar or colored badge alongside the percentage text.

---

## 5. Fix: Save `operator_id` in `spot_visits`

**Bug**: The insert into `spot_visits` does not include `operator_id`.

**Fix**: Get the current user's ID from `supabase.auth.getUser()` (or the `useAuth` hook) and include it in the insert:
```
operator_id: user?.id
```

Import and use the `useAuth` hook already available in the project.

---

## 6. Fix: Save Visit Type in `visit_line_items`

**Current behavior**: The `action_type` field maps visit types to enum values via `visitTypeData?.actionType`, but installation maps to `restock`, routine service maps to `collection`, etc. This is correct per the enum, but the specific visit type (installation vs routine_service) is lost.

**Fix**: Add a `visit_type` text field to the `spot_visits` table (not `visit_line_items`) to store the selected visit type string (e.g., "installation", "routine_service"). This preserves the operational context without changing the `visit_action_type` enum. The `action_type` on `visit_line_items` remains the correct enum value for each line item's action.

**Database migration**: Add column `visit_type text` to `spot_visits`.

---

## 7. Fix: Update `machine_slots` with `current_product_id` and `current_stock`

**Current behavior**: The submit mutation updates `current_stock` but does NOT update `current_product_id`.

**Fix**: Update the machine_slots update loop to also set:
- `current_product_id`: the `toyId` selected by the operator (especially critical for installation visits)
- `current_stock`: the calculated `currentStock` value
- `capacity`: the `capacity` value (for installation where operator sets it)
- `coin_acceptor`: the `pricePerUnit` value (for installation where operator sets it)

Updated mutation code for the slots update:
```typescript
for (const slot of slots) {
  const updateData: any = { current_stock: slot.currentStock };
  if (slot.toyId) updateData.current_product_id = slot.toyId;
  if (visitType === 'installation') {
    updateData.capacity = slot.capacity;
    updateData.coin_acceptor = slot.pricePerUnit;
  }
  await supabase
    .from('machine_slots')
    .update(updateData)
    .eq('id', slot.slotId);
}
```

---

## Database Migration

Add one column to `spot_visits`:

```sql
ALTER TABLE spot_visits ADD COLUMN IF NOT EXISTS visit_type text;
```

This stores the visit type string (installation, routine_service, inventory_audit, maintenance, emergency) for reporting context.

---

## Files Summary

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/NewVisitReport.tsx` | All 7 changes: setup info display, auto-installation detection, days-since-last-visit indicator with color coding and 30-day warning dialog, capacity color indicators, operator_id fix, visit_type saving, machine_slots product/stock fix |
| `src/integrations/supabase/types.ts` | Auto-updated after migration |

### Database
- Add `visit_type` text column to `spot_visits`

---

## Implementation Order

1. Database migration (add `visit_type` to `spot_visits`)
2. Import `useAuth` hook and fix `operator_id` saving
3. Fix `machine_slots` update to include `current_product_id`, `capacity`, `coin_acceptor`
4. Save `visit_type` in `spot_visits` insert
5. Add setup info display after spot selection
6. Add last visit query and days-since-last-visit indicator with colors
7. Add 30-day warning AlertDialog on submit
8. Add capacity color coding to slot cards
9. Auto-detect installation and set contract start date
