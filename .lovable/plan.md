

## Smart Inventory Ledger - Logistics vs Accounting Views

### Summary

Add a view toggle to the Inventory Ledger tab in `src/pages/ItemDetail.tsx`. The **Logistics View** (default) collapses transfer pairs into single rows and uses color-coded badges. The **Accounting View** shows the current raw detail.

### Changes (single file: `src/pages/ItemDetail.tsx`)

**1. New imports**
- `ArrowRightLeft` from lucide-react
- `Switch` from `@/components/ui/switch`

**2. New state**
- `const [ledgerView, setLedgerView] = useState<"logistics" | "accounting">("logistics")`

**3. New queries**
- **All warehouses**: `supabase.from("warehouses").select("id, name")` — needed to resolve both origin and destination warehouse names for transfers (current `warehouseStock` only has warehouses where this item has inventory)
- **User profiles for performed_by**: Collect unique `performed_by` UUIDs from `ledgerEntries`, then `supabase.from("user_profiles").select("id, first_names, last_names").in("id", uniqueIds)` — build a `Map<string, string>` of id to display name

**4. Logistics grouping logic (`useMemo`)**
- Group entries by `reference_id` where `movement_type === "transfer"`
- Collapse pairs (one negative = origin, one positive = destination) into a single `{ type: 'transfer', outEntry, inEntry }` row
- Keep all other entries as `{ type: 'single', entry }`
- Sort by date descending

**5. UI: Toggle above ledger list**
- `Switch` + label "Raw Accounting" in the top-right of the Card, inline with card header area

**6. UI: Accounting View**
- Current rendering as-is, plus a "Performed By" column showing the resolved user name after the date

**7. UI: Logistics View**

Each row is a horizontal card-style row (same pattern as current):

- **Transfer rows**: Light blue background (`bg-blue-50 dark:bg-blue-950/20 border-l-2 border-blue-400`). Badge "transfer" in blue. Movement column: `{Origin Name}` `<ArrowRightLeft className="h-3.5 w-3.5 text-blue-500 inline mx-1" />` `{Destination Name}` with absolute quantity. Performed By column. Date.

- **Sale/warehouse_sale/false_coin rows**: Subtle red-tinted left border (`border-l-2 border-red-400`). Red badge. Movement shows negative quantity + location.

- **Refill/receive/initial/swap_in/assembly_production rows**: Green left border (`border-l-2 border-green-400`). Green badge. Movement shows positive quantity + location.

- **Other rows** (removal, swap_out, reversal, adjustment, assembly_consumption): Appropriate existing color, no special row background.

- **Performed By column**: Shows `first_names` (or `first_names last_names` if available), or "—" if null.

- **No In/Dep/Out/Bal columns** in logistics view — replaced by single "Movement" column showing the quantity with +/- prefix.

**8. Totals row**: Only shown in Accounting View (current behavior).

### No database changes. No new files.

