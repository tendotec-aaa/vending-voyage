

## Three Enhancements: Auto-Driver on Route, Auto-Assignment on Activation, Multi-Location Selection

### What We're Building

1. **Auto-assign driver on route creation**: When a non-admin creates a route, automatically set `driver_id` to the current user
2. **Auto-assign "Route Operator" role on user activation**: When an admin activates a new user (first activation after the first user), automatically create a `user_assignments` row with the "Route Operator" role and global scope
3. **Multi-select locations in User Assignments**: Change the single-location dropdown to a multi-select checkbox list using `user_location_assignments` table

---

### 1. Auto-Assign Driver on Route Creation

**File**: `src/pages/Routes.tsx`

**Current logic**:
```typescript
createRoute.mutate({ name, scheduled_for: date }, {...});
```

**Updated logic**:
- Import `useAuth` and `useUserRole`
- If `!isAdmin`, pass `driver_id: user.id` to the mutation
- Admin keeps the current behavior (no auto-assignment, can assign later)

---

### 2. Auto-Assign Role on User Activation

**File**: `src/hooks/useTeamManagement.tsx`

**Current logic**:
`toggleUserActive` mutation only updates `user_profiles.active`

**Updated logic** (in `onSuccess` when `active === true`):
1. Query `app_roles` for the "Route Operator" role to get its ID
2. Check if user already has a `user_assignments` row
3. If not, insert a new `user_assignments` row with:
   - `role_id`: Route Operator role ID (`a0000000-0000-0000-0000-000000000002`)
   - `scope_type`: `'global'`
   - `scope_id`: `null`

This ensures newly activated users get a default assignment.

---

### 3. Multi-Select Locations in User Assignments Tab

**File**: `src/pages/AdminSecurity.tsx` (UserAssignmentsTab component)

**Current Implementation**:
- Single `scope_id` in `user_assignments` table for one location
- Uses `user_assignments.scope_id` as the location reference
- Only shows a single-select dropdown

**New Implementation**:
- Use the existing `user_location_assignments` table (already supports multiple locations per user)
- Replace the single-select dropdown with a multi-select popover/checkbox list
- When scope_type is "location", show assigned locations as badges
- Add a "Manage" button that opens a dialog with all locations as checkboxes
- Insert/delete rows in `user_location_assignments` on toggle

**UI Changes**:
- Replace single `<Select>` with a `<Popover>` containing a checkbox list of all locations
- Show selected locations as `<Badge>` pills
- Use `useUserLocations` hook logic inline or create a new hook for bulk operations

---

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Routes.tsx` | Auto-set `driver_id` for non-admin users |
| `src/hooks/useTeamManagement.tsx` | Auto-create Route Operator assignment on activation |
| `src/pages/AdminSecurity.tsx` | Multi-select locations using `user_location_assignments` |

---

### Data Flow

```text
Route Creation (non-admin):
  → createRoute.mutate({ name, scheduled_for, driver_id: user.id })
  → Route saved with current user as driver

User Activation:
  → toggleUserActive({ userId, active: true })
  → If first activation: insert user_assignments (Route Operator, global)

Location Assignment (Admin):
  → Toggle checkbox in multi-select
  → Insert/delete row in user_location_assignments
  → Multiple locations can be assigned to one user
```

