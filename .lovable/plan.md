
## Update: Explicit Discrepancy Confirmation for Unaccounted Inventory Routing

### What is Happening Now

The discrepancy detection and routing logic already exists in the codebase, but has two issues:

1. The `DiscrepancyConfirmDialog` already shows the missing units, but the messaging is unclear — it doesn't explicitly tell the user "these units will be placed in [Warehouse Name]" with enough clarity to build confidence.
2. The dialog requires a mandatory audit note of at least 10 characters before the user can confirm. If the user didn't type enough text, the button stays disabled — this is likely why it felt like the workflow "does not let me do this."
3. The system warehouse name is hardcoded as "Unaccounted Inventory" in the dialog text, but the actual database name of that warehouse is not fetched and shown dynamically.

### Proposed Changes

**1. `DiscrepancyConfirmDialog.tsx` — Redesign the dialog**

- Pass the actual system warehouse name (fetched from the DB) into the dialog so it displays the real warehouse name (e.g., "Unaccounted Inventory Bodega") dynamically.
- Add a clear "Routing Summary" section per item showing: Item name → X missing units → will be sent to `[System Warehouse Name]`.
- Make the audit note **optional with a default** — if left blank, a default note is auto-generated (e.g., "Missing 50 units — routed to Unaccounted Inventory for supplier reclaim"). This removes the blocker that prevented confirming.
- Change button label to: "Confirm — Route Missing Stock to [Warehouse Name]" to make the action crystal clear.

**2. `ReceiveStockDialog.tsx` — Pass system warehouse name**

- Pass the `systemWarehouse.name` prop from the already-fetched `systemWarehouse` query in `useReceiveStock` down into `DiscrepancyConfirmDialog`.

**3. `useReceiveStock.tsx` — Improve default note generation**

- When no `discrepancyNote` is provided, generate a descriptive default per item instead of a generic string, so the audit trail is always meaningful.

### What Does NOT Change

- The `receiving_allocations` audit trail is fully preserved — every unit going to the system warehouse is still recorded with `purchase_id`, `purchase_item_id`, `warehouse_id`, and `quantity`.
- The `receiving_notes` table still gets an entry for every discrepancy.
- The database schema is untouched.
- The overall two-step flow (verify items → confirm discrepancy) stays the same.

### Files to Modify

- `src/components/inventory/DiscrepancyConfirmDialog.tsx` — Redesign with explicit routing info and optional note
- `src/components/inventory/ReceiveStockDialog.tsx` — Pass `systemWarehouse.name` to the dialog
- `src/hooks/useReceiveStock.tsx` — Improve the default note fallback
