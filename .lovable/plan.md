

## Plan: Sort Slots by Slot Number + Machine Position (Grid Layout Order)

The desired order is: **slot_number ascending, then position_on_setup ascending** — creating a top-left → top-right → bottom-left → bottom-right reading pattern across machines.

### Current behavior
- **NewVisitReport**: `machineSlots` fetched with `.order('slot_number')` — groups by slot number but doesn't sub-sort by machine position.
- **VisitDetail**: `enrichedSlots` built from `lineItems` ordered by `created_at` — no slot/position sorting at all.

### Changes (2 files, sort logic only — no structural changes)

#### 1. `src/pages/NewVisitReport.tsx` (~line 545)
After generating `generatedSlots` from `machineSlots.map(...)`, add a `.sort()` before the cache overlay step:

Sort by `slotNumber` ascending first, then by the machine's `position_on_setup` ascending. The machine's `position_on_setup` is available by looking up the machine from the `machines` array.

#### 2. `src/pages/VisitDetail.tsx` (~line 255)
After building `enrichedSlots` from `lineItems.map(...)`, add a `.sort()`:

Sort by `slotNumber` ascending first, then by `machine.position_on_setup` ascending. The `position_on_setup` is already available via `li.slot?.machine?.position_on_setup`.

### Sort function (same logic in both files)

```text
Primary:  slot.slotNumber  ASC
Secondary: machine.position_on_setup  ASC
```

This produces the grid order:
- Slot 1, Position 1 (top-left)
- Slot 1, Position 2 (top-center)  
- Slot 1, Position 3 (top-right)
- Slot 2, Position 1 (bottom-left)
- Slot 2, Position 2 (bottom-center)
- Slot 2, Position 3 (bottom-right)

### Impact
- No data model changes
- No query changes
- No submission logic changes
- Pure display-order sort applied after data is already built

