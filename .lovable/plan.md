

## Plan: Assembly Category Filter, Visit Report ToyPicker Redesign, Sorting, and Inventory Ledger Fix

### 1. New Assembly Page — Category Filter for Components

**Problem**: The component dropdown shows all inventory items regardless of category, making it hard to find what you need.

**Solution**: Add a category filter dropdown above the component selector, similar to what was done for the Visit Report ToyPicker. The inventory query already fetches `item_detail` with joined fields but doesn't include `category_id`. Changes:

- Modify the inventory query (line 78) to include `category_id` in the `item_details` join: `item_detail:item_details(id, name, sku, cost_price, category_id)`
- Add a `componentCategoryFilter` state variable (default `"all"`)
- Add a category `Select` dropdown above the component selector, populated from the existing `categories` hook
- Filter `availableComponents` memo to respect the selected category
- Layout: Category dropdown on one row, component selector below it (full width)

---

### 2. New Visit Report — ToyPicker Redesign

**Problem**: The ToyPicker (category dropdown + search combobox) is crammed inside each slot card's grid, making the search box too small and looking messy. It's also repeated per slot.

**Solution**: Move the category filter to the **Visit Details card** (below Visit Type), so it's selected once for the entire visit. The individual slot cards will only show the searchable combobox (without the category dropdown), giving it full width.

- Add a `toyCategoryFilter` state variable in `NewVisitReport`
- Add a "Product Category" `Select` dropdown in the Visit Details card (lines 1604-1686), in the grid alongside Visit Type and Visit Date
- Filter the `products` list passed to `ToyPicker` based on `toyCategoryFilter` before passing it down
- Update `ToyPicker` component: when used in the visit report, skip the inline category filter (either remove it from ToyPicker or add a prop like `hideCategory`). The simplest approach is to just pass the already-filtered products and remove the category filter from inside ToyPicker by adding a `showCategoryFilter` prop (default `true`) 
- This gives the combobox full width in each slot card

---

### 3. Inventory Page — Sort by Highest Inventory Cost

**Problem**: Items are not sorted by cost.

**Solution**: Add `.sort((a, b) => b.totalInventoryCost - a.totalInventoryCost)` to the `filteredInventory` memo in `Inventory.tsx` (after the filter, before return).

---

### 4. Warehouse Page — Sort by Highest Quantity

**Problem**: Items are not sorted by quantity.

**Solution**: Add `.sort((a, b) => (b.quantity_on_hand || 0) - (a.quantity_on_hand || 0))` to the `filteredInventory` memo in `Warehouse.tsx`.

---

### 5. Inventory Ledger — Diagnosis and Fix

**Investigation findings**:
- The `inventory_ledger` table has 6 rows (all from assembly and stock receiving backfill operations).
- The edge function `submit-visit-report` has proper ledger logic with `appendLedger()`, but this function **silently swallows errors** — it calls `await db.from("inventory_ledger").insert(...)` without checking the result.
- The visit that exists in the system (`ea06d6f3...`) has zero corresponding ledger entries (`reference_type = 'visit'`), confirming ledger inserts are failing silently during visit submission.
- RLS policies are permissive and the edge function uses the service role key, so RLS is not the issue.
- The check constraints allow the correct movement types (`refill`, `removal`, `swap_in`, `swap_out`, `adjustment`) and reference types (`visit`).
- **Root cause**: The `getClaims` method used in the edge function (line 199) may not be available in the Supabase JS SDK version imported (`@supabase/supabase-js@2`). If auth fails, `userId` would be undefined but processing continues. However, the visit itself is created successfully, so auth isn't the primary issue. More likely, the `appendLedger` inserts are failing because the `getRunningBalance` helper queries with strict `warehouse_id`/`slot_id` equality using `.eq()` and `.is()` — if the conditions don't match existing rows, it returns 0, which is fine. Let me look more carefully...
  
  Actually, reviewing the edge function code again: the `appendLedger` function does `await db.from("inventory_ledger").insert(...)` but **does not check for errors**. If any insert fails (e.g., a constraint violation we haven't caught, or a timing issue), it's silently ignored and the visit still completes.

**Fix**: Update the `appendLedger` helper in the edge function to capture and throw errors from the insert operation. Add `const { error } = await db.from(...)` and `if (error) throw error`. This will surface any hidden issues and ensure ledger entries are actually written. Also add error logging so we can debug any remaining issues.

Additionally, for **stock receiving** (`useReceiveStock.tsx`), the hook already writes ledger entries directly from the client. These work because we can see "receive" entries in the DB. The assembly hook (`useAssemblies.tsx`) also writes ledger entries and those exist too. So the only broken path is the visit report edge function.

**Files to modify**:
1. `src/pages/NewAssembly.tsx` — Add category filter for components
2. `src/components/visits/ToyPicker.tsx` — Add `showCategoryFilter` prop
3. `src/pages/NewVisitReport.tsx` — Move category filter to Visit Details card, pass filtered products
4. `src/pages/Inventory.tsx` — Sort by inventory cost descending
5. `src/pages/Warehouse.tsx` — Sort by quantity descending
6. `supabase/functions/submit-visit-report/index.ts` — Add error handling to `appendLedger`

