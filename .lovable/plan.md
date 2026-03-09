

## Dynamic RBAC & Security Hub

### Overview

Replace the hardcoded `user_role` enum system with a dynamic, capability-based permission engine. Create 3 new tables, a `has_permission()` Postgres function, a `usePermissions()` hook, and a two-tab admin UI at `/admin/security`.

---

### 1. Database Migrations

**Migration 1: Core RBAC tables**

```sql
-- App Roles (dynamic, admin-created)
CREATE TABLE public.app_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- Permissions per role
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.app_roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  UNIQUE(role_id, permission_key)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Scope enum
CREATE TYPE public.assignment_scope AS ENUM ('global', 'location', 'personal');

-- User assignments
CREATE TABLE public.user_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.app_roles(id) ON DELETE CASCADE,
  scope_type assignment_scope NOT NULL DEFAULT 'global',
  scope_id uuid, -- references locations.id when scope_type = 'location'
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.user_assignments ENABLE ROW LEVEL SECURITY;
```

**RLS Policies** (all 3 tables): Authenticated can SELECT. Only admins (via existing `has_role(auth.uid(), 'admin')`) can INSERT/UPDATE/DELETE.

**Migration 2: `has_permission()` function**

```sql
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_assignments ua
    JOIN public.role_permissions rp ON rp.role_id = ua.role_id
    WHERE ua.user_id = _user_id
      AND rp.permission_key = _perm_key
      AND rp.is_enabled = true
  )
$$;
```

Also create a helper to get scope:

```sql
CREATE OR REPLACE FUNCTION public.get_user_scope(_user_id uuid)
RETURNS TABLE(scope_type assignment_scope, scope_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ua.scope_type, ua.scope_id
  FROM public.user_assignments ua
  WHERE ua.user_id = _user_id
  LIMIT 1
$$;
```

**Migration 3: Seed default roles**

Insert 3 starter roles with their permission keys:

- **Administrator**: all permissions enabled
- **Route Operator**: `view_routes`, `manage_own_route`, `view_stock`
- **Warehouse Manager**: `view_stock`, `edit_bodega`

Permission keys to seed (all as rows in `role_permissions`):
`view_costs`, `view_profits`, `view_stock`, `edit_bodega`, `view_all_routes`, `manage_own_route`, `manage_users`, `view_analytics`, `manage_purchases`, `manage_sales`, `manage_maintenance`

**Migration 4: Migrate existing users**

Backfill `user_assignments` from existing `user_roles` table, mapping `admin` -> Administrator role, `route_operator` -> Route Operator role, `warehouse_manager` -> Warehouse Manager role.

> Note: The old `user_roles` table and `has_role()` function are kept for backward compatibility with existing RLS policies. New features use `has_permission()`.

---

### 2. New Files

| File | Purpose |
|------|---------|
| `src/hooks/usePermissions.tsx` | Fetches user's assignment + all enabled permission_keys. Caches via React Query. Exposes `has(key)`, `scope`, `permissions[]`, `isAdmin` |
| `src/pages/AdminSecurity.tsx` | Two-tab page: Roles & Permissions Matrix, User Assignments |
| `src/components/auth/PermissionGuard.tsx` | Route guard component: checks `has(perm)`, shows 403 page if denied |
| `src/components/auth/AccessDenied.tsx` | Beautiful 403 empty state with Shield icon and "Back to Dashboard" button |

---

### 3. `usePermissions()` Hook

```typescript
// Returns cached permission set for current user
const { has, permissions, scope, roleId, roleName, isLoading } = usePermissions();
// has('view_costs') -> boolean
// scope -> { type: 'global'|'location'|'personal', scopeId?: uuid }
```

Query joins `user_assignments` -> `app_roles` -> `role_permissions` in a single fetch. Falls back to checking `has_role(admin)` for backward compat (admins always pass).

---

### 4. Security Hub Page (`/admin/security`)

**Tab 1: Roles & Permissions Matrix**
- Left sidebar: list of roles with "Add Role" button (Dialog with name + description)
- Selecting a role shows the permissions grid in the main panel
- Permission categories with Switch toggles:
  - **Finance**: `view_costs`, `view_profits`
  - **Inventory**: `view_stock`, `edit_bodega`
  - **Operations**: `view_all_routes`, `manage_own_route`
  - **Supply Chain**: `manage_purchases`, `manage_sales`
  - **Admin**: `manage_users`, `view_analytics`, `manage_maintenance`
- Each Switch fires an instant upsert mutation to `role_permissions` (no Save button)
- Delete role button (with confirmation dialog)

**Tab 2: User Assignments**
- Table of all users from `user_profiles`
- Columns: Name, Email, Role (Select dropdown of `app_roles`), Scope (Select: Global/Location/Personal), Location (Select, visible only when scope = Location)
- Changing any dropdown fires an instant upsert to `user_assignments`

---

### 5. Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/admin/security` route wrapped in `<RequireRole roles={['admin']}>`. Import `PermissionGuard` for sensitive routes (sales, purchases, analytics) |
| `src/components/layout/AppSidebar.tsx` | Import `usePermissions`. Add permission-to-link mapping. Conditionally render sidebar sections. Add "Security" link under Business (admin only) |
| `src/components/auth/PermissionGuard.tsx` | New component wrapping children, shows `<AccessDenied>` if `!has(requiredPerm)` |

**Sidebar permission mapping:**
```text
Supply Chain section -> has('view_costs') || has('manage_purchases')
Analytics -> has('view_analytics')
Users/Company -> has('manage_users')
Security -> isAdmin (from old has_role check)
```

Operations, Assets, Locations, Personal, Dashboard always visible.

---

### 6. Route Guards in App.tsx

Wrap sensitive routes with `<PermissionGuard>`:
- `/sales/*` -> `manage_sales`
- `/purchases/*` -> `manage_purchases`
- `/analytics` -> `view_analytics`
- `/users/*` -> `manage_users`
- `/admin/security` -> stays with `<RequireRole roles={['admin']}>`

---

### Key Design Decisions

- **Backward compatible**: `user_roles` table and `has_role()` stay. Admin check for the security page itself uses the existing enum-based guard
- **Instant mutations**: No bulk save -- each Switch toggle immediately updates the DB via React Query mutation + `invalidateQueries`
- **No RLS rewrite yet**: Existing RLS policies stay. `has_permission()` is created and ready for future RLS migration. Rewriting all existing policies is a separate, careful task
- **Scope stored but frontend-only initially**: The scope column is stored and assignable. Wiring scope into RLS on routes/visits is deferred to avoid breaking existing access

