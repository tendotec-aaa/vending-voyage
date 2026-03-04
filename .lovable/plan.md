## Plan: Audit Trail & Ledger Logic

### Problem 1: Visual Reconciliation & Full Audit Trail

We are transforming the "Report Discrepancy" feature from a simple log into a full stock reconciliation event.

**File:** `src/pages/ItemDetail.tsx` — `handleReportVisualDiscrepancy` (approx. lines 469-497)

**The Logic Flow:**

- **Calculate Delta:** `visualQuantity - totalStock`
- **Update** `stock_discrepancy`: Insert record with `status: "resolved"` (since we are fixing it immediately).
- **Update** `inventory_adjustments`:
  - If Delta>0: Type = `"surplus"`.
  - If Delta<0: Type = `"shortage"`.
- **Update** `inventory_ledger`: Insert movement with `movement_type: "adjustment"`. This record will drive the "In" or "Out" columns.
- **Update** `inventory` **(Table)**: Update `quantity_on_hand` for the relevant warehouse by adding the Delta.
- **UI Refresh**: Update dialog labels to **"Reconcile & Adjust Stock"** and add a disclaimer that this action will permanently change inventory counts.

---

### Problem 2: Ledger Column Categorization (Circular Logic)

We are fixing the "Dep" (Deployed) column so it doesn't incorrectly swallow sales, and ensuring removals from machines are treated as **Inbound** to the warehouse, not **Outbound** losses.

**The Triple-Column Logic:**


|                    |                                         |                                                                                    |
| ------------------ | --------------------------------------- | ---------------------------------------------------------------------------------- |
| Category           | Definition                              | Included Movements                                                                 |
| **IN** (Inward)    | Stock entering the warehouse/system.    | Warehouse receipts, returns from machines (removals), and **Surplus Adjustments**. |
| **DEP** (Deployed) | Stock moving to or located in machines. | Refills (Warehouse Out / Slot In) and Swaps.                                       |
| **OUT** (Outward)  | Stock leaving the ecosystem.            | **Sales (Sold)** and **Shortage Adjustments**.                                     |


Export to Sheets

**The Revised Code Logic:** Replace the current `isDep` / `inward` / `outward` logic (lines 1026-1030) with this:

TypeScript

```
// 1. IN: Warehouse Inbound (positive qty) OR Positive Adjustments (Surplus)
const isIn = (entry.warehouse_id && entry.quantity > 0) 
          || (entry.movement_type === "adjustment" && entry.quantity > 0);

// 2. DEP: Moving to field (Warehouse neg) OR Arriving in slot (Slot pos)
const isDep = (entry.warehouse_id && entry.quantity < 0 && entry.movement_type === "refill")
           || (entry.slot_id && entry.quantity > 0 && ["refill", "swap_in"].includes(entry.movement_type));

// 3. OUT: Sales OR Negative Adjustments (Shortage)
const isOut = (entry.movement_type === "sold")
           || (entry.movement_type === "adjustment" && entry.quantity < 0);

```

---

### UI & Styling Adjustments

1. **Rendering Values**:
  - `inward`: Display `entry.quantity` if `isIn`.
  - `deployed`: Display `Math.abs(entry.quantity)` if `isDep`.
  - `outward`: Display `Math.abs(entry.quantity)` if `isOut`.
2. **Totals Row (lines 1084-1096)**: Update the reduction logic to sum based on these three new boolean flags.
3. **Color Coding**: Ensure `adjustment` types are styled distinctly in the ledger to highlight reconciliation events (e.g., using a warning amber for adjustments vs. standard green/red for receipts/sales).

---

### Files to Modify

- `src/pages/ItemDetail.tsx`:
  - `handleReportVisualDiscrepancy` function.
  - Ledger column mapping logic.
  - Table Footer/Totals calculation.
  - Reconciliation Dialog UI text.