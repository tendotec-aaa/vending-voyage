

## Multi-Part Implementation Plan

This plan covers four areas: Locations page improvements, spot sorting, visit report photo functionality, and False Coin / Jam By Coin logic corrections.

---

### Part A: Locations Page -- Collapsed List View with Expandable Spots

**Current behavior:** Each location is a Card that always shows all its spots via an Accordion. Spot names are not clickable links to the Spot Detail page.

**Changes to `src/pages/Locations.tsx`:**

1. Wrap each location card in a Collapsible component so the entire spot section is hidden by default. The location header row becomes the toggle -- clicking a chevron expands to reveal the spot accordion underneath.
2. Make each spot name a clickable link that navigates to `/spots/{spotId}` (the Spot Detail page).
3. The location name remains clickable to `/locations/{locationId}` as it is today.

---

### Part B: Natural Numeric Sorting for Spots

**Current behavior:** Spots are sorted alphabetically by name, so "Spot 1, Spot 10, Spot 2, Spot 3..." appears.

**Changes to `src/pages/Locations.tsx` and `src/pages/NewVisitReport.tsx`:**

1. Replace `.sort((a, b) => a.name.localeCompare(b.name))` with a natural sort comparator using `localeCompare` with `{ numeric: true }` option: `.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))`.
2. Apply the same fix in the spots query `order` on the Locations page by sorting client-side after fetching.
3. Apply the same fix to the spots dropdown in `NewVisitReport.tsx`.

---

### Part C: Visit Photo and Observation Photo -- Working Camera and Upload

**Current behavior:** The "Take Photo" and "Upload" buttons in the "Photo and Sign Off" section and the "Upload Image" button in the Observations section are non-functional placeholder buttons.

**Changes to `src/pages/NewVisitReport.tsx`:**

1. Add state for the visit verification photo (`visitPhotoFile`, `visitPhotoUrl`) and observation photo (`observationPhotoFile`, `observationPhotoUrl`).
2. Replace the placeholder "Take Photo" button with a hidden file input (`accept="image/*" capture="environment"`) that opens the device camera.
3. Replace the placeholder "Upload" button with a hidden file input (`accept="image/*"`) for gallery selection.
4. Show a thumbnail preview with a delete button when a photo is selected.
5. In the submission mutation (`submitVisitReport`):
   - Upload the visit photo to `item-photos` bucket under path `visit-photos/{visitId}/verification.jpg`.
   - Upload the observation photo under path `visit-photos/{visitId}/observation.jpg`.
   - Update the `spot_visits` record's `verification_photo_url` column (already exists in the schema) with the uploaded URL.
   - The observation photo URL will be appended to the `notes` field of `spot_visits` since there's no dedicated column.
6. Same pattern for the observation section's "Upload Image" button.

**Changes to `supabase/functions/submit-visit-report/index.ts`:**

- No changes needed to the edge function -- photos are uploaded separately from the client after the visit ID is returned.

---

### Part D: False Coins and Jam By Coin Logic Corrections

**User's requested behavior:**
- **False Coins:** Each false coin means current stock should be **-1** (a false coin was inserted, machine dispensed a toy without valid payment, so stock decreases by 1 per false coin).
- **Jam By Coin (+1):** A coin was inserted but no toy dispensed (jam), so current stock should be **+1** (the toy that should have dispensed is still in the machine). Currently, the code **subtracts** 1 from stock for `by_coin`, which is wrong.

**Changes to `src/pages/NewVisitReport.tsx` (updateSlot function, line ~486-508):**

Current logic:
```
const jamAdjustment = updated.jamStatus === 'by_coin' ? 1 : 0;
currentStock = lastStock - (unitsSold + jamAdjustment) + unitsRefilled - unitsRemoved;
cashCollected = (unitsSold + jamAdj) * pricePerUnit;
```

New logic:
```
const jamAdjustment = updated.jamStatus === 'by_coin' ? 1 : 0;
const falseCoinsAdj = updated.falseCoins || 0;
// Jam By Coin: coin taken, toy NOT dispensed -> stock +1, cash +1
// False Coins: no real coin, toy WAS dispensed -> stock -1
currentStock = lastStock - unitsSold + jamAdjustment - falseCoinsAdj + unitsRefilled - unitsRemoved;
// Cash: sold units + jam coins (those are real coins collected)
cashCollected = (unitsSold + jamAdjustment) * pricePerUnit;
```

Key changes:
- `jamAdjustment` is now **added** to stock (not subtracted) because the toy stayed in the machine.
- `falseCoins` is **subtracted** from stock because toys were dispensed without valid payment.
- `jamAdjustment` is still **added** to cash because the coin was collected (real money).
- `falseCoins` does NOT add to cash (they are fake coins, no real revenue).

**Changes to `supabase/functions/submit-visit-report/index.ts` (edge function):**

Update the backend inventory adjustment calculation to match:

Current (line ~170-173 in edge function):
```
const jamAdj = s.jamStatus === "by_coin" ? 1 : 0;
const expected = s.lastStock - (s.unitsSold + jamAdj) + s.unitsRefilled - s.unitsRemoved;
```

New:
```
const jamAdj = s.jamStatus === "by_coin" ? 1 : 0;
const falseCoinsAdj = s.falseCoins || 0;
const expected = s.lastStock - s.unitsSold + jamAdj - falseCoinsAdj + s.unitsRefilled - s.unitsRemoved;
```

Also update the `currentStock` calculation in the response's `adjustmentsLogged` section to match.

Add `falseCoins` to the `SlotPayload` interface in the edge function (it's already sent from the frontend but not declared in the interface).

**Warehouse inventory impact:** The connected inventory ledger in the edge function already handles `unitsRefilled` (deducted from warehouse) and `unitsRemoved` (returned to warehouse). False coins represent toys that left the machine without payment -- these are effectively "sold" from the machine perspective (stock is reduced), so no additional warehouse adjustment is needed. The financial loss shows up in the cash discrepancy (fewer coins than toys dispensed).

---

### Technical Summary

| File | Changes |
|------|---------|
| `src/pages/Locations.tsx` | Collapsible location cards, natural sort for spots, clickable spot names to `/spots/{id}` |
| `src/pages/NewVisitReport.tsx` | Working photo upload/camera for visit and observations, natural sort for spot dropdown, false coins and jam stock logic fix |
| `supabase/functions/submit-visit-report/index.ts` | Add `falseCoins` to interface, fix jam/false coin expected stock formula |

### Execution Order

1. Fix Locations page (collapsible + sort + spot links)
2. Fix NewVisitReport spot sorting
3. Implement photo upload functionality
4. Fix false coins and jam logic in frontend and edge function

