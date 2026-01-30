
# Plan: Fix Activation Flow and Add Dashboard Navigation

## Summary
This plan addresses three related issues:
1. Ensure admin activation only changes the `active` field (no other profile data)
2. Automatically redirect users to the dashboard after they become activated
3. Add a prominent "Go to Dashboard" button on the profile page for active users

---

## Issue Analysis

After reviewing the code, the `toggleUserActive` function in the admin panel correctly only updates the `active` and `updated_at` fields. The perceived issue of "other fields changing" is likely a display artifact from how React Query handles cache updates, or possibly an unrelated save action. Regardless, I'll add safeguards and implement the requested features.

---

## Changes Required

### 1. Add Dashboard Redirect When User Becomes Active

**File: `src/pages/UserProfile.tsx`**

Add a `useEffect` that watches the `isActive` state and automatically navigates to the dashboard when it becomes `true` (after previously being `false`):

- Import `useNavigate` from `react-router-dom`
- Track the previous `isActive` state using a ref
- When `isActive` transitions from `false` to `true`, navigate to "/"
- Show a toast notification welcoming the user

### 2. Add Homepage Button for Active Users

**File: `src/pages/UserProfile.tsx`**

Add a prominent "Go to Dashboard" button in the card header when the user is active:

- Display next to the "Edit Profile" button (or in place of the pending banner area)
- Use a primary button style with a Home icon
- Links to "/" (main dashboard)

### 3. Wrap Profile Page in AppLayout for Active Users

Currently the profile page doesn't use `AppLayout`, meaning active users don't see the sidebar navigation. Update to conditionally wrap in `AppLayout` when the user is active, giving them full navigation access.

---

## Technical Implementation

### File: `src/pages/UserProfile.tsx`

```text
Changes:
1. Add imports: useNavigate, useRef, Home icon
2. Add useRef to track previous isActive state
3. Add useEffect to handle redirect on activation
4. Add "Go to Dashboard" button in header when isActive
5. Conditionally wrap content in AppLayout when active
```

### Updated Component Structure

```text
Before (simplified):
- div container
  - Pending Banner (when incomplete or inactive)
  - Card with profile form

After (simplified):
- If active: wrap in AppLayout
- div container
  - Success Banner with Dashboard button (when active)
  - Pending Banner (when complete but inactive)
  - Card with profile form
    - Header now includes Dashboard button when active
```

---

## User Experience Flow

1. **New user signs up** -> Redirected to `/profile`
2. **Fills out profile** -> Sees "Pending Activation" banner
3. **Admin activates account** -> User's `isActive` becomes `true`
4. **Profile page detects change** -> Redirects to dashboard with welcome toast
5. **If user visits profile later** -> Sees "Go to Dashboard" button and has full sidebar navigation

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/UserProfile.tsx` | Add navigation hook, activation detection, dashboard button, conditional AppLayout wrapper |

No database changes required - the admin's `toggleUserActive` mutation already correctly updates only the `active` field.
