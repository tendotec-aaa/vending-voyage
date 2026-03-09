

## Operator Dashboard & Admin Ghost Mode

### Overview

Three deliverables: (1) a mobile-first Operator Dashboard at `/dashboard` showing today's route as a checklist, (2) Admin Ghost Mode via `?as_user=UUID` on the same page, and (3) a real-data "Latest Routes" widget replacing the hardcoded placeholder on the Admin home page.

### New Files

| File | Purpose |
|------|---------|
| `src/pages/OperatorDashboard.tsx` | Mobile-responsive route checklist with progress bar |
| `src/hooks/useOperatorDashboard.tsx` | Fetches today's route, stops, and visit completion for a given user ID |
| `src/pages/AdminOperators.tsx` | Table of operators with "View Dashboard" link per row |
| `src/components/dashboard/LatestRoutes.tsx` | Real-data widget showing 5 most recent routes with completion % |

### Hook: `useOperatorDashboard(userId)`

- Fetches the most recent `route` where `driver_id = userId` and `status` in ('planned', 'active'), ordered by `scheduled_for` desc, limit 1
- Fetches `route_stops` for that route with nested `locations` and `spots`
- For each stop's spots, checks if a `spot_visit` exists with `visit_date` = today and `operator_id = userId`
- Returns: `route`, `stops[]` (each with `visited: boolean`), `progressPct`, `isLoading`

### Operator Dashboard (`/dashboard`)

- Uses `useSearchParams` to read `as_user` param
- If `as_user` is present AND logged-in user is admin → fetch data for that user ID (Ghost Mode banner shown)
- Otherwise → fetch data for logged-in user
- UI: Progress bar at top, vertical card list of stops with status badges (✅/🕒)
- Clicking a pending stop navigates to `/visits/new?spot_id=<id>` (pre-fills the visit form)
- If no route found → "No route assigned today" empty state

### Routing Logic

- The current `/` route stays as the Admin dashboard (Index.tsx)
- Add `/dashboard` route for the Operator Dashboard
- Non-admin users (`route_operator`) get redirected from `/` to `/dashboard`, OR the sidebar shows "My Dashboard" linking to `/dashboard`
- Simpler approach: add `/dashboard` as a new route, add "My Dashboard" to sidebar for operators

### Admin Operators Page (`/admin/operators`)

- Table of all `user_profiles` joined with `user_roles` where role = 'route_operator'
- Columns: Name, Email, Active status
- "View Dashboard" button per row → navigates to `/dashboard?as_user=<user_id>`
- Protected by `RequireRole` (admin only)

### Latest Routes Widget

- Replace the hardcoded `UpcomingRoutes` component with real data
- Query: 5 most recent `routes` with `driver` profile joined, plus count of `route_stops` and count of stops that have a `spot_visit` today
- Shows route name, driver name, completion % as a mini progress bar

### Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/dashboard` and `/admin/operators` routes |
| `src/components/layout/AppSidebar.tsx` | Add "My Dashboard" for operators, "Operators" under admin items |
| `src/components/dashboard/UpcomingRoutes.tsx` | Replace hardcoded data with real route queries |
| `src/pages/Index.tsx` | No changes needed (keeps admin dashboard as-is) |

### No Database Changes Required

All data exists: `routes.driver_id`, `route_stops`, `spot_visits` with `visit_date` and `operator_id`.

