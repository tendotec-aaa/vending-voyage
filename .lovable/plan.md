

## Redesign: Item Detail Page Layout

### What Exists Today

The current page has:
- A header with back button, item name, SKU, and an Edit button
- A photo card + "Item Information" card side by side (name, SKU, category, subcategory, type, description)
- Two cards side by side: "Cost Summary (FIFO)" and "Stock Breakdown"
- A "Purchase Batches (FIFO)" list at the bottom

All data queries are already in place: item details, warehouse stock, machine stock, and purchase batches.

### What Will Change

The page will be restructured into the 5 sections described, while keeping ALL existing data, queries, editing, and photo upload functionality intact. Two new queries will be added for Logistics History and total units sold.

---

### Section 1 — Navigation and Identity Header

- Keep the back arrow navigation and Edit button
- Product title stays prominent (text-2xl font-bold)
- Add colorful status badges next to the title: **Type** badge (e.g., "Merchandise") and **Category** badge (e.g., "Capsules") using distinct color variants
- SKU shown as a subtle monospace label below the title
- Photo is removed from this top section and will not be shown (or optionally kept as a small avatar-sized thumbnail next to the title if desired — the upload/edit functionality remains accessible via the Edit dialog)

### Section 2 — High-Level Metric Cards (4-column grid)

Four summary cards in a responsive row:

| Card | Value | Source |
|---|---|---|
| Unit Cost | Weighted avg cost (already computed) | `weightedAvgCost` |
| Warehouse Stock | Total in warehouses | `totalWarehouse` |
| Deployed | Total in machines | `totalMachine` |
| Total Sold | Sum of all `visit_line_items` for this product | New query on `visit_line_items` |

The "Total Sold" card requires a new query that sums `meter_reading` (or counts line items with action_type = "collection") from `visit_line_items` where `product_id = id`.

### Section 3 — Financial Performance Panel

A single wide card with a 5-column horizontal breakdown:

| Metric | Source |
|---|---|
| Total Acquired | Sum of `quantity_ordered` from `purchaseBatches` |
| Total Inventory Value | `totalInventoryCost` (already computed) |
| Total Revenue | Sum of `cash_collected` from `visit_line_items` for this product (new query) |
| Gross Profit | Revenue - Inventory Cost |
| Margin % | (Gross Profit / Revenue) * 100 |

If there is a discrepancy between computed stock and actual physical counts (surplus/shortage data from the inventory table or audit records), a yellow alert banner will appear below this section. This will check if any warehouse stock row has a discrepancy flag or if the `view_sales_ledger` reveals mismatches.

### Section 4 — Detailed History Tabs

Two tabs using the existing `Tabs` component:

**Tab 1: Logistics History**
A new query on `visit_line_items` joined with `spot_visits` (for date, location) filtered by `product_id = id`. Displayed as a table with:
- Date (from `spot_visits.visit_date`)
- Location (from `spot_visits` -> `spots` -> `locations`)
- Action Type (color-coded badge: restock = green, collection = blue, service = yellow, swap = orange)
- Quantity change (+added / -removed)
- Cash collected

**Tab 2: Acquisition History**
The existing Purchase Batches list, reformatted into a proper table with columns:
- Date (purchase created_at or received_at)
- PO Number
- Status badge
- Quantity ordered / received / remaining
- Unit cost
- Batch value

### Section 5 — Metadata Footer

A small, muted-color info block at the bottom showing:
- Created: `item.created_at` formatted
- Last Updated: `item.updated_at` formatted
- System ID: `item.id` (monospace, truncated with copy button)

---

### Technical Details

**New queries to add in ItemDetail.tsx:**

```typescript
// Total units sold for this product
const { data: salesData } = useQuery({
  queryKey: ["item-sales-total", id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("visit_line_items")
      .select("meter_reading, cash_collected, quantity_added, quantity_removed")
      .eq("product_id", id!);
    if (error) throw error;
    return data;
  },
  enabled: !!id,
});

// Logistics history (visit line items with visit context)
const { data: logisticsHistory = [] } = useQuery({
  queryKey: ["item-logistics-history", id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("visit_line_items")
      .select(`
        id, action_type, quantity_added, quantity_removed,
        cash_collected, meter_reading, created_at,
        spot_visit:spot_visits(
          visit_date, status,
          spot:spots(name, location:locations(name))
        )
      `)
      .eq("product_id", id!)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  enabled: !!id,
});
```

**Computed values from salesData:**
```typescript
const totalUnitsSold = (salesData || []).reduce(
  (sum, s) => sum + (s.meter_reading || 0), 0
);
const totalRevenue = (salesData || []).reduce(
  (sum, s) => sum + (s.cash_collected || 0), 0
);
const grossProfit = totalRevenue - totalInventoryCost;
const marginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
const totalAcquired = purchaseBatches.reduce(
  (sum, b) => sum + (b.quantity_ordered || 0), 0
);
```

**Files to modify:**
- `src/pages/ItemDetail.tsx` — Full layout restructure + 2 new queries + Tabs for history

**No new files, no database changes, no schema changes.**

**Existing functionality preserved:**
- Photo upload/remove (moved into the edit flow or kept as small thumbnail)
- Admin-only edit mode with category/subcategory/description editing
- All existing queries (item detail, warehouse stock, machine stock, purchase batches)
- Navigation to purchase detail pages from acquisition history rows
- FIFO cost calculations

