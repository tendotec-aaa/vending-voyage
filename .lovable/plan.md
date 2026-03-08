

## Plan: Add warehouse sales to Total Sold + unified Logistics History timeline

### Step 1 — New query for warehouse sales (data fetching)

Add a `useQuery` for `sale_items` joined with `sales` (for sale_number, sale_date, buyer_name, warehouse name):

```ts
const { data: warehouseSales = [] } = useQuery({
  queryKey: ["item-warehouse-sales", id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("sale_items")
      .select(`id, quantity, unit_price, total_price, created_at,
        sale:sales(id, sale_number, sale_date, buyer_name,
          warehouse:warehouses(name))`)
      .eq("item_detail_id", id!);
    if (error) throw error;
    return data;
  },
  enabled: !!id && !!user,
});
```

Place this after the existing `logisticsHistory` query (~line 209).

### Step 2 — Include warehouse sales in Total Sold calculation

Update `totalUnitsSold` (line 632-634) to sum both field sales and warehouse sales:

```ts
const fieldUnitsSold = (salesData || []).reduce((sum, s) => sum + (s.units_sold || 0), 0);
const warehouseUnitsSold = (warehouseSales || []).reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
const totalUnitsSold = fieldUnitsSold + warehouseUnitsSold;
```

### Step 3 — Unified chronological timeline in Logistics History tab

Instead of rendering `logisticsHistory` and warehouse sales as separate lists, build a single `unifiedHistory` array:

```ts
const unifiedHistory = [
  ...logisticsHistory.map((row: any) => ({
    type: "visit" as const,
    date: row.spot_visit?.visit_date || row.created_at,
    data: row,
  })),
  ...(warehouseSales || []).map((row: any) => ({
    type: "sale" as const,
    date: row.sale?.sale_date || row.created_at,
    data: row,
  })),
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
```

Compute this inside the Logistics History tab content (or as a `useMemo`). Then replace the current `logisticsHistory.map(...)` block (lines 1532-1618) with a single `unifiedHistory.map(...)` that uses a conditional:

- **`type === "visit"`**: Renders the existing visit card (action badge, location, 8-column grid with Last/Current/Audited/Sold/Added/Removed/False/Jam). Clicking navigates to `/visits/:id`.
- **`type === "sale"`**: Renders a new sale card with a "warehouse_sale" badge (using existing `actionColors` style from `movementColors`), buyer name, warehouse name, quantity, unit price, total price. Clicking navigates to `/sales/:id`.

The empty state check becomes `unifiedHistory.length === 0 && discrepancies.length === 0`.

The discrepancy reconciliation section at the top remains unchanged.

### Files changed

- `src/pages/ItemDetail.tsx` — Only file modified. Three changes: new query, updated total calculation, unified timeline rendering.

