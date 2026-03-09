

## Final RBAC Audit & Inventory/Warehouse Separation

### Current State

- **Roles**: `user_roles` table has `admin`, `route_operator`, `warehouse_manager`. The `useUserRole` hook exposes `isAdmin`, `isRouteOperator`, `isWarehouseManager`.
- **Permissions**: `usePermissions` hook checks `app_roles` + `role_permissions` + `user_assignments`. Admins bypass all checks.
- **Sidebar**: Already has role-based filtering (admin vs non-admin) but doesn't distinguish Accountant from Operator.
- **Pages**: Most pages are only `ProtectedRoute` wrapped without role/permission guards. Only `/purchases`, `/sales`, `/users`, `/company`, `/insights/*`, `/admin/*` have guards.
- **Inventory page** (`/inventory`): Shows financial data (WAC, Total Inventory Cost). No role restriction.
- **Warehouse page** (`/warehouse`): Operational view but also visible to everyone. No cost columns currently.
- **OperatorInventory** (`/operator/inventory`): Simplified view already exists but is separate.

### Approach

Rather than adding a new DB role "accountant", we'll use the existing `warehouse_manager` role as the "Accountant" role (or we can add it). Looking at the `user_role` enum...

The `user_role` enum currently has: `admin`, `route_operator`, `warehouse_manager`. The user wants three roles: Admin, Accountant, Operator. We should **not** modify the enum (per constraints), but we can map `warehouse_manager` → Accountant conceptually, OR we can add `accountant` to the enum.

Given the user explicitly mentions "Accountant" as a distinct role, we need to add it to the `user_role` enum.

### Database Changes

1. Add `'accountant'` to the `user_role` enum
2. Update `useUserRole` to expose `isAccountant`

### Implementation Plan

#### 1. Database Migration
- Add `'accountant'` value to `user_role` enum

#### 2. Update `useUserRole` hook
- Add `isAccountant` boolean (`role === 'accountant'`)
- Update the `UserRole` type

#### 3. Warehouse Management Page (Repurpose existing `/warehouse`)
- The existing `/warehouse` page already shows Item Name, SKU, Category, Quantity — no financial columns
- Rename in sidebar to "Warehouse Management" under an "Operations" group
- Add access: Admin (full), Operator (view + adjustment via existing `AddWarehouseItemDialog`), Accountant (view only — hide action buttons)
- The existing `OperatorInventory` page becomes redundant; redirect `/operator/inventory` → `/warehouse`

#### 4. Inventory & Valuation Page (Keep existing `/inventory`)
- Already shows WAC, Purchase Price, Total Valuation
- Add route guard: `RequireRole roles={['admin', 'accountant']}` (deny operators)
- Move to sidebar under "Supply Chain" group

#### 5. Route Guards (App.tsx)
Apply `RequireRole` wrappers:

| Route | Allowed Roles |
|-------|--------------|
| `/` (Admin Dashboard) | admin, accountant |
| `/dashboard` | all (operator default) |
| `/inventory`, `/inventory/:id` | admin, accountant |
| `/insights/*` (Profitability, Item Analytics, Spot Health) | admin, accountant |
| `/users`, `/users/:id`, `/company` | admin only |
| `/admin/*` | admin only |
| `/warehouse` | admin, accountant, route_operator |
| `/purchases/*`, `/sales/*` | admin, accountant |
| `/visits/new` | all |
| `/visits`, `/visits/:id` | all |
| `/routes`, `/routes/:id` | all |
| `/machines`, `/machines/:id`, `/setups` | admin, accountant |
| `/locations`, `/locations/:id`, `/spots`, `/spots/:id` | admin, accountant |
| `/maintenance` | all |

#### 6. Sidebar Cleanup (AppSidebar.tsx)
Restructure using role checks (not just `isAdmin`):

**Admin sees**: Everything
**Accountant sees**: Dashboard, Operations (Visits, Routes, Maintenance), Assets (Inventory, Warehouse, Machines, Setups), Locations, Supply Chain, Insights, Business (minus User Management), Personal
**Operator sees**: My Dashboard, Operations (Visits, Routes, Maintenance), Warehouse, Personal

Remove "Field Tools" section — replace with Warehouse under Operations for operators.

#### 7. Files Modified

| File | Change |
|------|--------|
| Migration SQL | Add `'accountant'` to `user_role` enum |
| `src/hooks/useUserRole.tsx` | Add `isAccountant`, update type |
| `src/App.tsx` | Add `RequireRole` guards to all unprotected routes |
| `src/components/layout/AppSidebar.tsx` | Role-based sidebar filtering for 3 roles |
| `src/pages/Warehouse.tsx` | Hide action buttons for accountant role |
| `src/pages/OperatorInventory.tsx` | Can be removed; `/operator/inventory` redirects to `/warehouse` |

#### 8. Handling the Redirect
- `/operator/inventory` → redirect to `/warehouse`
- Operators hitting `/` → redirect to `/dashboard`
- Operators hitting `/inventory` → `RequireRole` redirects to `/`

### Role Matrix Summary

```text
Page/Feature              Admin  Accountant  Operator
─────────────────────────────────────────────────────
Admin Dashboard (/)         ✓       ✓          ✗→/dashboard
Operator Dashboard          ✓       ✓          ✓
Inventory & Valuation       ✓       ✓          ✗
Warehouse Management        ✓       ✓(view)    ✓(view+adjust)
Machines/Setups             ✓       ✓          ✗
Locations/Spots             ✓       ✓          ✗
Suppliers/Purchases/Sales   ✓       ✓          ✗
Insights (all)              ✓       ✓          ✗
Users/Company               ✓       ✗          ✗
Admin (Operators/Security)  ✓       ✗          ✗
Visits/Routes/Maintenance   ✓       ✓          ✓
Submit Visit                ✓       ✓          ✓
```

