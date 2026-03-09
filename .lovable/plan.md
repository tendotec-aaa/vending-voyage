

## Operator Scope & Field Tools Expansion

### Overview

Four workstreams: (1) `user_location_assignments` table for geographic scoping, (2) Admin UI to manage assignments, (3) Operator Dashboard expansion with "Pending Issues" and simplified inventory, (4) sidebar navigation update for operators.

### 1. Database Migration

Create `user_location_assignments` join table:

```sql
CREATE TABLE public.user_location_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, location_id)
);

ALTER TABLE public.user_location_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can select" ON public.user_location_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert" ON public.user_location_assignments FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can delete" ON public.user_location_assignments FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
```

### 2. New Hook: `useUserLocations(userId)`

- Fetches `user_location_assignments` for a given user
- Returns `locationIds: string[]` and helper `isAssigned(locationId)`
- Used by operator dashboard and operator inventory to scope data

### 3. Admin Operators Page Updates (`AdminOperators.tsx`)

- Add a "Manage Locations" button per operator row (next to "View Dashboard")
- Opens a dialog with a checkbox list of all locations
- Checked = assigned. Toggle inserts/deletes rows in `user_location_assignments`
- Shows current assignment count as a badge in the table

### 4. Operator Dashboard Expansion (`OperatorDashboard.tsx`)

Add a **"Pending Issues"** section below the route stops:
- Query `stock_discrepancy` (status = 'pending') joined with spots/locations
- Filter by operator's assigned location IDs (from `useUserLocations`)
- Show: spot name, item name, discrepancy type, difference
- Clicking navigates to the relevant spot

### 5. New Page: Operator Inventory (`OperatorInventory.tsx`)

A simplified version of the Inventory page at `/operator/inventory`:
- Columns: Item Name, Category, Warehouse Qty only
- **No** Cost, WAC, Total Value columns
- Red highlight for items where `warehouseQty` is below a threshold (we can use `warehouseQty <= 0` as the "low stock" indicator since there's no min_stock column currently -- or add `min_stock` to `item_details` if desired)
- Same search/filter as main inventory but stripped of financial data
- Reuses `useConsolidatedInventory` logic but renders fewer columns

### 6. Sidebar Navigation Updates (`AppSidebar.tsx`)

For non-admin users (operators), restructure to show:
- **My Dashboard** (already exists)
- **Operations**: Visit Reports, Routes, Maintenance
- **Field Tools** (new group): Inventory (links to `/operator/inventory`), Issues (links to `/operator/issues` or anchor on dashboard)
- **Hide**: Supply Chain, Insights, Business, Admin sections (already permission-gated)
- **Hide**: Assets section items like Warehouse, Machines, Setups (not relevant to operators)

### 7. Routing (`App.tsx`)

Add:
- `/operator/inventory` → `OperatorInventory` (protected, no role restriction since it's a simplified view)

### Files Summary

| File | Action |
|------|--------|
| Migration SQL | Create `user_location_assignments` table |
| `src/hooks/useUserLocations.tsx` | New hook for fetching user's assigned locations |
| `src/pages/AdminOperators.tsx` | Add "Manage Locations" dialog |
| `src/pages/OperatorDashboard.tsx` | Add "Pending Issues" section |
| `src/pages/OperatorInventory.tsx` | New simplified inventory page |
| `src/components/layout/AppSidebar.tsx` | Add operator-specific nav items, hide admin sections |
| `src/App.tsx` | Add `/operator/inventory` route |
| `src/integrations/supabase/types.ts` | Auto-updated after migration |

### Scoping Logic

```text
Admin user → all data, no filtering
Operator → INNER JOIN user_location_assignments
           to filter routes, spots, issues by assigned locations
```

The `useOperatorDashboard` hook already filters by `driver_id` (route assignment), so route data is naturally scoped. The new "Pending Issues" and future data will use `useUserLocations` for geographic filtering.

