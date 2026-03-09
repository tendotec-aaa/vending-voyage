## ✅ COMPLETED: Bulletproof Append-Only Ledger Architecture

### What was implemented:

1. **DB Trigger `sync_inventory_from_ledger`** — Fires after every INSERT on `inventory_ledger`. Automatically recomputes `inventory.quantity_on_hand` via `SUM(quantity)` for the affected `(item_detail_id, warehouse_id)` pair. The `inventory` table is now a materialized cache of the ledger.

2. **Edge Function cleanup** (`submit-visit-report/index.ts`) — Removed `upsertInventory()` and `deductInventory()` helper functions. Only `appendLedger()` calls remain as the sole write path. The trigger handles all inventory sync.

3. **useReceiveStock.tsx cleanup** — Removed `upsertInventory` helper. Ledger inserts now drive inventory sync via trigger.

4. **ItemDetail.tsx — Fixed doubling bug** — Removed manual `inventory.update()` call from `handleReportVisualDiscrepancy`. Only the ledger insert remains; trigger does the rest.

5. **Admin "Reverse Entry" button** — Each ledger row (non-reversal) has an undo icon. On click, inserts a compensating `reversal` entry with `-originalQuantity`. Trigger auto-corrects inventory.

6. **Warehouse Sale feature** — New `WarehouseSaleDialog` component. Records wholesale sales as `warehouse_sale` movement type in ledger. Accessible from Stock Discrepancy section.

7. **`warehouse_sale` movement type** — Added to DB constraint and UI color mapping.

### Architecture now:
- **Single write path**: All inventory changes go through `inventory_ledger` INSERT
- **Trigger sync**: `trg_sync_inventory_after_ledger` auto-updates `inventory.quantity_on_hand`
- **Append-only**: No UPDATE/DELETE on ledger. Errors corrected via reversal entries
- **Audit trail**: Complete history of every stock movement with performer tracking

---

## ✅ COMPLETED: Category-Based SKU Generation with Uniqueness Guardrails

### Format
`{CategoryInitials}{SubcategoryInitials}-{6-digit-number}`
- Category "Maquinas Vending", Subcategory "Juguetes Capsulas" → `MVJC-482910`
- No category/subcategory → `XX-482910`

### What was implemented:

1. **`src/lib/skuGenerator.ts`** — Rewritten with:
   - `generateCode(name)` — extracts first letter of each word, max 2 chars
   - `generateSkuCode(categoryName?, subcategoryName?)` — combines initials + random 6-digit number
   - `insertItemDetailWithRetrySku(insertData, categoryName?, subcategoryName?)` — wraps INSERT with retry loop (max 3 attempts) on unique constraint violation (PostgreSQL error 23505)

2. **`src/hooks/usePurchases.tsx`** — Uses `insertItemDetailWithRetrySku` with category/subcategory name lookup

3. **`src/hooks/useWarehouseInventory.tsx`** — Uses `insertItemDetailWithRetrySku`, accepts `categoryName`/`subcategoryName` params

4. **`src/hooks/useAssemblies.tsx`** — Uses `insertItemDetailWithRetrySku` with category/subcategory name lookup

5. **`src/pages/NewPurchase.tsx`** — Uses `generateSkuCode()` for preview/placeholder SKUs

### Uniqueness guarantees:
- **DB constraint** `item_definitions_sku_key` (UNIQUE on `sku`) prevents duplicates
- **Retry loop** regenerates SKU on collision, up to 3 attempts
- **Single helper function** used by all item creation flows

---

## ✅ COMPLETED: Sales Order System with Atomic RPC

### What was implemented:

1. **BEFORE INSERT trigger `compute_ledger_running_balance`** — Auto-computes `running_balance` on `inventory_ledger` inserts. All callers (existing and new) no longer need to compute it — the trigger overwrites whatever value is passed. Existing code continues working with zero breakage.

2. **`sales` table** — Header with `sale_number`, `sale_date`, `buyer_name`, `buyer_contact`, `warehouse_id`, `subtotal`, `tax_rate`, `tax_amount`, `total_amount`, `currency`, `paid`, `status`, `notes`, `created_by`. RLS enabled.

3. **`sale_items` table** — Line items with `sale_id`, `item_detail_id`, `quantity`, `unit_price`, `total_price`. Cascading delete on sale. RLS enabled.

4. **`create_sales_order` RPC** — SECURITY DEFINER PostgreSQL function. Accepts single JSON payload. Atomically inserts sale header, all line items, and `inventory_ledger` entries (movement_type: `warehouse_sale`, negative quantity). Running balance = 0 placeholder (trigger computes real value). Full transaction safety.

5. **`useSales.tsx` hook** — Queries sales with nested items, warehouses, item catalog. `createSale` mutation calls RPC. `useStockCheck` for pre-submit validation.

6. **`Sales.tsx` list page** — Searchable table with sale number, buyer, date, items count, total, paid badge.

7. **`NewSale.tsx` form** — Multi-line item entry with warehouse selection, tax rate, buyer info. Soft stock warning via AlertDialog when quantity exceeds `quantity_on_hand` — user can confirm and proceed (allows negative inventory).

8. **`SaleDetail.tsx`** — Read-only detail with header cards, line items table.

9. **Sidebar + routing** — DollarSign icon under Supply Chain. Routes: `/sales`, `/sales/new`, `/sales/:id`.

### Architecture:
- **Single atomic write path**: All sales go through `create_sales_order` RPC (no multi-step client inserts)
- **No running_balance in frontend**: RPC passes `0`, BEFORE INSERT trigger computes correct value
- **Soft stock warnings**: UI warns but allows proceeding — inventory can go negative
- **Ledger integrity**: Every sale creates `warehouse_sale` ledger entries, existing AFTER INSERT trigger syncs `inventory.quantity_on_hand`

---

## ✅ COMPLETED: Dynamic RBAC & Security Hub

### What was implemented:

1. **`app_roles` table** — Dynamic, admin-created roles with name + description. RLS: authenticated SELECT, admin-only INSERT/UPDATE/DELETE.

2. **`role_permissions` table** — Maps roles to permission keys with `is_enabled` boolean. Cascading delete on role. Same RLS pattern.

3. **`user_assignments` table** — Maps users to roles with `assignment_scope` enum (`global`, `location`, `personal`) and optional `scope_id`. Unique per user.

4. **`has_permission()` SQL function** — SECURITY DEFINER. Joins `user_assignments` → `role_permissions` to check if a user has a specific permission key enabled.

5. **`get_user_scope()` SQL function** — Returns user's scope type and scope_id.

6. **Seed data** — 3 default roles (Administrator, Route Operator, Warehouse Manager) with 11 permission keys each. Existing users backfilled from `user_roles` table.

7. **`usePermissions()` hook** — Fetches user's assignment, role name, enabled permission keys, and scope. Caches via React Query. Exposes `has(key)` function. Admins always pass all checks.

8. **`PermissionGuard` component** — Route guard that shows `AccessDenied` (403 page with Shield icon) if user lacks required permission.

9. **`AdminSecurity` page (`/admin/security`)** — Two-tab interface:
   - **Tab 1: Roles & Permissions Matrix** — Left sidebar to select/create roles, main panel with categorized permission toggles (Finance, Inventory, Operations, Supply Chain, Admin). Instant mutation on each Switch toggle.
   - **Tab 2: User Assignments** — DataTable of all users with Role dropdown, Scope dropdown, and Location selector (when scope = location). Instant upsert on change.

10. **Dynamic Sidebar** — Supply Chain, Insights, Business, and Admin sections conditionally rendered based on permission keys. Dashboard, Operations, Assets, Locations, and Personal always visible.

11. **Route Guards in App.tsx** — `/sales/*` → `manage_sales`, `/purchases/*` → `manage_purchases`, `/analytics` → `view_analytics`, `/users/*` + `/company` → `manage_users`, `/admin/security` → `RequireRole(['admin'])`.

### Architecture:
- **Backward compatible**: Old `user_roles` table and `has_role()` function preserved for existing RLS policies
- **Data-driven**: Permissions stored in DB, not hardcoded. Admin can create new roles and toggle capabilities on the fly
- **Instant mutations**: Each Switch/Select change fires immediate DB update via React Query mutation
- **Scope stored but frontend-only initially**: Scope column assignable in UI, RLS wiring deferred

### Permission Keys:
`view_costs`, `view_profits`, `view_stock`, `edit_bodega`, `view_all_routes`, `manage_own_route`, `manage_users`, `view_analytics`, `manage_purchases`, `manage_sales`, `manage_maintenance`
