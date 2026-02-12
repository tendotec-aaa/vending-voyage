# Plan: Setup Auto-Naming, Machine Slots Display, Drag-and-Drop, Machines Enhancements, and Machine Detail Page

This plan covers 7 interconnected changes across the application.

---

## 1. Auto-Generate Setup Names from Machine Serial Numbers

**Current**: User manually types a setup name.
**Target**: Setup name is auto-generated based on the serial numbers of assigned machines.

### Naming Logic

Given machines with serials like `AA-001`, `BB-010`, `DD-009`:

- Extract the prefix (letters before the dash) from each machine: `AA`, `BB`, `DD`
- Extract the numeric suffix from each machine: `001`, `010`, `009`
- Concatenate prefixes: `AABBDD`
- Concatenate suffixes: `001010009`
- Final name: `AABBDD-001010009`

For a single machine `AA-001`: name = `AA-001` (kept as-is since there is only one).

### Changes

- `**src/pages/Setups.tsx**`:
  - Remove the manual "Name" input field from the Create Setup dialog
  - Add a `generateSetupName(machineSerials: string[])` utility function
  - Auto-compute the setup name from selected machines before insert
  - Show a preview of the generated name in the dialog
  - When machines change in "Manage Machines" dialog, optionally update the setup name

---

## 2. Show Machine Slots on Location, Spot, Location Detail, and Spot Detail Pages

**Current**: These pages show machines but not their individual slots (what product is loaded, stock qty, capacity).
**Target**: Under each machine, show its slots with product name, current stock, and capacity.

### Data Fetching

Query `machine_slots` joined with `item_details` (via `current_product_id`) for each machine:

```
machine_slots: id, slot_number, current_stock, capacity, current_product_id
  -> item_details: name (via current_product_id)
```

### Changes

- `**src/pages/SpotDetail.tsx**`:
  - Fetch `machine_slots` for all machines in the spot's setup(s)
  - Under each machine row, show a sub-list of slots: Slot #, Product Name, Stock/Capacity (e.g., "45/150")
- `**src/pages/LocationDetail.tsx**`:
  - Add a section showing spots with their setups, machines, and machine slots
  - Fetch setups by `spot_id` for each spot, then machines by `setup_id`, then slots by `machine_id`
- `**src/pages/Locations.tsx**` (accordion rows):
  - In the expanded spot rows, optionally show a condensed view of machines and slot counts

---

## 3. Drag-and-Drop Machine Position in Manage Machines Dialog

**Current**: Manage Machines dialog shows machines listed by position with add/remove buttons but no reordering.
**Target**: Allow drag-and-drop to reorder machines, updating `position_on_setup` in the database.

### Approach

Use native HTML5 drag-and-drop (no additional library needed) since the list is small (1-4 items typically, max ~10 for custom).

### Changes

- `**src/pages/Setups.tsx**` (Manage Machines dialog):
  - Add `draggable` attribute to each machine row
  - Handle `onDragStart`, `onDragOver`, `onDrop` events
  - On drop, reorder the machines array and update `position_on_setup` for all affected machines via a batch update mutation
  - Show a drag handle icon (GripVertical from lucide) on each row
  - Show position labels (Left/Center/Right for triple, Position N for others)

---

## 4. Machines Page: Add Start Date Column

**Current**: Machines table shows Serial Number, Model, Setup/Location, Status, Slots.
**Target**: Add a "Start Date" column showing when the machine was purchased from the original purchase order date of arrival.

### Changes

- `**src/pages/Machines.tsx**`:
  - Add "Start Date" column header after "Slots"
  - Display the purchases.recieved_at date (make sure that this date is being properly accounted for and inserted by user in the recieving stock workflow) formatted as a date (e.g., `Jan 15, 2025`)

---

## 5. Inventory Page: Rename "In Machines" to "Deployed"

**Current**: Column header says "In Machines".
**Target**: Rename to "Deployed".

### Changes

- `**src/pages/Inventory.tsx**`:
  - Change `<TableHead>` text from "In Machines" to "Deployed"
  - Update summary card label from "In Machines" to "Deployed"

---

## 6. Machines Page: Dual Status Badges + Sorting + Clickable Navigation

**Current**: Single status badge showing the `machine_status` enum value (in_warehouse, deployed, maintenance, retired).
**Target**: Two separate badges per machine:

### Badge 1: Assignment Status


| Condition                                            | Badge                   | Link                 |
| ---------------------------------------------------- | ----------------------- | -------------------- |
| `setup_id` is not null and `status` is not `retired` | **Assigned** (green)    | Links to Setups page |
| `setup_id` is null and `status` is not `retired`     | **Unassigned** (yellow) | No link              |
| `status` is `retired`                                | **Retired** (gray)      | No link              |


### Badge 2: Location Status


| Condition                                                                | Badge                   | Link                                                 |
| ------------------------------------------------------------------------ | ----------------------- | ---------------------------------------------------- |
| `setup_id` is not null and setup has a `spot_id`                         | **Deployed** (green)    | Links to Spot Detail page                            |
| `setup_id` is null or setup has no `spot_id` and status is not `retired` | **In Warehouse** (blue) | Links to Warehouse page (future: specific warehouse) |
| `status` is `retired`                                                    | **Discarded** (gray)    | No link                                              |


### Sorting

Machines should be sorted in this priority order:

1. Unassigned machines first (need attention)
2. Assigned but not deployed (in warehouse with a setup)
3. Deployed machines
4. Retired/Discarded machines last

### Changes

- `**src/pages/Machines.tsx**`:
  - Replace single "Status" column with two badge columns or a combined cell with two badges
  - Fetch setups data to determine if a setup has a `spot_id` (already fetched)
  - Make badges clickable with `onClick` navigation
  - Sort `filteredMachines` by the priority order above
  - Make entire row clickable to navigate to Machine Detail page

---

## 7. Machine Detail Page (New)

**New file**: `src/pages/MachineDetail.tsx`
**Route**: `/machines/:id`

### Content

- **Header**: Serial number, item name, status badges (same dual badges as list)
- **Machine Info Card** (admin editable):
  - Serial Number (read-only)
  - Serial Generation (read-only)
  - Item Name / Model (editable via dropdown)
  - Number of Slots (read-only after creation)
  - Cash Key, Toy Key (editable)
  - Start Date (created_at, read-only)
- **Current Assignment Card**:
  - Setup name (linked), position in setup
  - Spot name (linked), Location name (linked)
  - Or "Unassigned" / "In Warehouse" if not deployed
- **Machine Slots Card**:
  - List of all slots with: Slot #, Current Product, Stock, Capacity, Coin Acceptor value
  - Admin can update slot product assignment and capacity
- **Maintenance History Card**:
  - Fetch `maintenance_tickets` where `machine_id = this machine`
  - Show list of tickets: date, issue type, priority, status, description
  - Link to maintenance page or ticket detail
- **Status Actions** (admin):
  - Buttons to change status (Deploy, Return to Warehouse, Set to Maintenance, Retire)

### Changes

- `**src/pages/MachineDetail.tsx**`: New file with all the above
- `**src/App.tsx**`: Add route `/machines/:id`
- `**src/pages/Machines.tsx**`: Make rows clickable to navigate to `/machines/:id`

---

## 8. Setups Page: Accordion Cards with Location/Spot Info

**Current**: Setup cards show machines and manage/delete buttons but no location/spot info.
**Target**: Add accordion expand/collapse to each card, and show the location and spot where the setup is deployed.

### Changes

- `**src/pages/Setups.tsx**`:
  - Fetch spots and locations data to resolve setup -> spot -> location chain
  - In the card header, show a compact summary: setup name, type badge, machine count
  - Add a collapsible section (using Collapsible component) that shows:
    - Deployed location and spot (with links) or "Not deployed"
    - Machine list with positions and serial numbers
    - Manage Machines and Delete buttons move inside the collapsible area

---

## Files Summary

### New Files


| File                          | Purpose                                                                |
| ----------------------------- | ---------------------------------------------------------------------- |
| `src/pages/MachineDetail.tsx` | Machine detail page with slots, maintenance history, status management |


### Modified Files


| File                           | Changes                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| `src/pages/Setups.tsx`         | Auto-generate setup name, drag-and-drop positions, accordion cards with location info |
| `src/pages/Machines.tsx`       | Dual status badges, sorting, Start Date column, clickable rows to detail page         |
| `src/pages/Inventory.tsx`      | Rename "In Machines" to "Deployed"                                                    |
| `src/pages/SpotDetail.tsx`     | Show machine slots (product, stock, capacity) under each machine                      |
| `src/pages/LocationDetail.tsx` | Show spots with setups, machines, and slots breakdown                                 |
| `src/pages/Locations.tsx`      | Optionally show condensed slot info in accordion spot rows                            |
| `src/App.tsx`                  | Add `/machines/:id` route                                                             |


---

## Implementation Order

1. Auto-generate setup names (Setups.tsx)
2. Inventory column rename (quick change)
3. Machines page: dual badges, sorting, Start Date column
4. Machine Detail page (new)
5. Drag-and-drop in Manage Machines dialog
6. Machine slots display on Spot Detail and Location Detail pages
7. Setups page accordion with location/spot info
8. Route registration in App.tsx