

## Dashboard UI Polish & Alert Logic Refinement

Four targeted edits across 4 files. No database changes.

### 1. `src/pages/Index.tsx` (line 45)

Change the KPI grid classes:
- **From**: `grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6`
- **To**: `grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4`

This ensures cards stack 2-wide on mobile, 3 on tablet, and only go full 6-wide on xl+ screens. The tighter `gap-4` prevents squeeze.

### 2. `src/components/dashboard/KPICard.tsx` (line 26)

Add `overflow-hidden relative` to the Card className to prevent badge/icon overflow into adjacent cards:
- **From**: `"p-6 bg-card border-border hover:shadow-md transition-shadow"`
- **To**: `"p-6 bg-card border-border hover:shadow-md transition-shadow overflow-hidden relative"`

No other changes needed — icons are already passed correctly from Index.tsx (`DollarSign`, `TrendingUp`, `Truck`, `MapPin`, `Calculator`, `AlertTriangle`).

### 3. `src/hooks/useDashboardStats.tsx`

**Low stock query (lines 242-243)**: Change threshold from `< 100` to `< 4000` and append `.neq('quantity_on_hand', 0)` server-side:
```typescript
.not("warehouse_id", "is", null)
.lt("quantity_on_hand", 4000)
.neq("quantity_on_hand", 0);
```

**Critical slots filter (lines 263-265)**: Add spot-assignment check alongside deployed status:
```typescript
.filter((row: any) => row.machine?.status === "deployed" && row.machine?.setup?.spot != null)
```

### 4. `src/components/dashboard/DashboardAlerts.tsx` (line 83)

Update alert text from `"Below 100 Units"` to `"Below 4,000 Units"`.

