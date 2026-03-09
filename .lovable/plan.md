

## Master ERP Refactor: Professional Onboarding & Operator Performance Dashboard

### Part 1: Signup Refactor (First Names / Last Names)

**Current state**: Signup has a single `fullName` field. The `user_profiles` table already has `first_names` and `last_names` columns. The `handle_new_user_profile` trigger only sets `email`, `active`, `profile_completed` — it does NOT use auth metadata for names. So the signup metadata is unused.

**Change**: Replace single `fullName` field with `firstNames` and `lastNames` in `Signup.tsx`. Pass them as `first_names` / `last_names` in auth metadata. After signup succeeds, update the `user_profiles` row with these names (or rely on the onboarding flow which already captures them).

Files to modify:
- `src/pages/Signup.tsx` — two fields, updated validation schema, pass metadata
- `src/i18n/es.json` / `en.json` — add `auth.firstNames`, `auth.lastNames` keys

### Part 2: Operator Performance Stats on Dashboard

**Current state**: The `OperatorDashboard.tsx` shows route stops and pending issues. No performance KPIs exist.

**New section**: Add a "Performance Stats" card grid between the route progress and the pending issues section. Uses a new `useOperatorPerformance` hook.

**KPI Cards** (Current Week vs Previous Week, Monday-Sunday):

| Card | Data Source | Calculation |
|------|-----------|-------------|
| Visitas | `spot_visits` filtered by `operator_id` | Count this week vs last week |
| Problemas | `maintenance_tickets` filtered by `reporter_id` | Count this week vs last week |
| Tickets Resueltos | `maintenance_tickets` where `status='resolved'` and `resolved_at` in range | Count this week |
| Efectivo Recaudado | `spot_visits.total_cash_collected` | Sum this week vs last week |

**Note on "Fill Efficiency" and "Service Velocity"**: The database has no "suggested refill" column or visit start/end timestamps on `spot_visits`. These metrics cannot be calculated from existing schema. Will implement the 4 KPIs above that ARE available.

Files to create/modify:
- `src/hooks/useOperatorPerformance.tsx` — new hook querying week-over-week stats
- `src/pages/OperatorDashboard.tsx` — add KPI card grid
- `src/i18n/es.json` / `en.json` — add `operatorPerformance.*` keys

### Part 3: Stale Spot Alert System

**New KPI card** on the Operator Dashboard: "Puntos sin Visita (>7 días)" — counts spots where latest visit > 7 days ago. Scoped to operator's assigned locations.

**Interactive Dialog**: Clicking the card opens a dialog with a table:
- Columns: Punto, Ubicación, Última Visita, Días Sin Visita
- Sorted by oldest first
- Color coding: 8-10 days = orange, 10+ days = red
- For operators: filtered by their assigned locations
- For admins in ghost mode: filtered by target user's locations

Data query: For each spot in assigned locations, find the MAX `visit_date` from `spot_visits`, calculate days elapsed, filter where > 7 days.

Files to create/modify:
- `src/components/dashboard/StaleSpotDialog.tsx` — new dialog component
- `src/hooks/useOperatorPerformance.tsx` — include stale spots query
- `src/pages/OperatorDashboard.tsx` — add stale spot card + dialog trigger

### Part 4: i18n for all new strings

New translation keys under `operatorPerformance`:
```
"operatorPerformance": {
  "title": "Mi Rendimiento",
  "visits": "Visitas",
  "issuesFlagged": "Problemas Reportados",
  "ticketsResolved": "Tickets Resueltos",
  "cashCollected": "Efectivo Recaudado",
  "thisWeek": "esta semana",
  "vsLastWeek": "vs semana anterior",
  "staleSpots": "Puntos sin Visita (>7 días)",
  "staleSpotsDesc": "Puntos que necesitan atención urgente",
  "spotName": "Punto",
  "locationName": "Ubicación",
  "lastVisitDate": "Última Visita",
  "daysElapsed": "Días Sin Visita",
  "noStaleSpots": "Todos los puntos están al día",
  "neverVisited": "Nunca visitado"
}
```

Also add `auth.firstNames` ("Nombres") and `auth.lastNames` ("Apellidos") to both JSON files.

### Part 5: Onboarding & UserProfile i18n

Translate hardcoded strings in `Onboarding.tsx` and `UserProfile.tsx` to use `t()` calls. Add `profile.*` namespace keys.

### Files Summary

| File | Action |
|------|--------|
| `src/pages/Signup.tsx` | Split name into two fields |
| `src/hooks/useOperatorPerformance.tsx` | New — week-over-week stats + stale spots |
| `src/components/dashboard/StaleSpotDialog.tsx` | New — dialog with stale spots table |
| `src/pages/OperatorDashboard.tsx` | Add performance cards + stale spot card |
| `src/pages/Onboarding.tsx` | i18n all strings |
| `src/pages/UserProfile.tsx` | i18n all strings |
| `src/i18n/es.json` | Add all new keys |
| `src/i18n/en.json` | Add all new keys |

