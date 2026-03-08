

## Route Builder Logic Guardrails & Editable Manifesto

### 1. Hard Cap Guardrail -- `computeSlotRefill` in `src/hooks/useRoutes.tsx`

Current function calculates `velocity * days * multiplier` without checking if it exceeds available space. Fix:

```typescript
export function computeSlotRefill(
  slot: SlotData,
  velocityMap: Map<string, VelocityData>,
  multiplier: number
): number {
  const emptySpace = Math.max(0, (slot.capacity || 150) - (slot.current_stock || 0));
  const v = velocityMap.get(slot.id);
  if (v && v.dailyVelocity > 0) {
    const velocityDemand = Math.ceil(v.dailyVelocity * v.daysSinceLastVisit * multiplier);
    return Math.min(velocityDemand, emptySpace); // HARD CAP
  }
  // Velocity 0 or no history: top-off
  return Math.ceil(emptySpace * multiplier);
}
```

The key change: `Math.min(velocityDemand, emptySpace)` -- never suggest more than the machine can physically hold.

### 2. Editable Loading Manifesto -- `src/components/routes/PickList.tsx`

- Add local state: `useState<Map<string, number>>` for manual overrides keyed by `productId`
- Each product row gets a number `<Input>` pre-filled with the calculated total, editable by the user
- When the user changes a value, it updates the override map
- Expose overrides to parent via a new `onOverridesChange` callback prop so RouteDetail can use them in Copy Summary
- Show the system-suggested amount as a small label beside the input (e.g., "Suggested: 85")

### 3. Auto-Naming & Date Navigation -- `src/pages/Routes.tsx`

- Remove the "Route Name" `<Input>` from the create dialog
- Add a list of fun prefixes: `["Thunder Run", "Salinas Mission", "Golden Route", "Iron Trail", "Swift Dash", "Eagle Run", "Blaze Path", "Storm Ride"]`
- On create, auto-generate: `randomPrefix + " - " + format(selectedDate, "MMMM d")`
- Keep the date picker

### 4. New WhatsApp Structure -- `handleCopyRouteSummary` in `src/pages/RouteDetail.tsx`

Restructure the output to put the Loading Manifest FIRST (right after date/driver), use the new formatting with `•` bullets, use override values from the editable manifesto, and add the disclaimer at the bottom.

New structure:
```
📋 ROUTE: Thunder Run - March 15
📅 Saturday, Mar 15, 2026
🚗 Driver: John Doe

📦 LOADING MANIFEST:
• Product Name — 100 (Refill: 80, Swap: 20)
———————————————
🔢 Total Units to Load: 250
———————————————

--- STOPS ---

📍 Location Name
  • +50 units - Product A
  • SWAP: Old → New (150 units)

🔧 MAINTENANCE (2):
• Jam — Location (high)

** This is only a suggestion please note the actual amount in the visit report correctly.
```

### 5. State wiring in `src/pages/RouteDetail.tsx`

- Add `useState<Map<string, number>>` for manifesto overrides
- Pass `onOverridesChange` to `<PickList>`
- Use override values (falling back to calculated) in `handleCopyRouteSummary`
- Pass `velocityMap` to `RouteStopCard` (already done)

### Files changed

| File | Change |
|------|--------|
| `src/hooks/useRoutes.tsx` | Add `Math.min(velocityDemand, emptySpace)` hard cap |
| `src/components/routes/PickList.tsx` | Add editable inputs, override state, callback prop |
| `src/pages/Routes.tsx` | Remove name input, auto-generate name from prefix + date |
| `src/pages/RouteDetail.tsx` | Override state, new WhatsApp format, manifest-first order, disclaimer |

