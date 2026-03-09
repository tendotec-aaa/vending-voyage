

## Add `is_component` Flag to Item Types

### Overview
Add a new boolean flag `is_component` to the `item_types` table and Admin UI, then use it to filter the component picker in the Assembly workflow so only items with `is_component = true` appear as selectable raw materials.

### Phase 1: Database Migration
Add `is_component boolean NOT NULL DEFAULT false` to `item_types`. Update the "Spare Part" and "Supply" seed types to set `is_component = true` (sensible defaults for raw materials).

```sql
ALTER TABLE public.item_types ADD COLUMN IF NOT EXISTS is_component boolean NOT NULL DEFAULT false;
UPDATE public.item_types SET is_component = true WHERE name IN ('Spare Part', 'Supply');
```

### Phase 2: Frontend Changes

**4 files modified:**

| File | Change |
|------|--------|
| `src/hooks/useItemTypes.tsx` | Add `is_component` to `ItemType` interface, `ItemTypeFlag` union, query select, and flag default objects |
| `src/components/admin/ItemTypesTab.tsx` | Add `{ key: 'is_component', label: 'Component' }` to `FLAG_COLUMNS` array; add `is_component: false` to `newFlags`/`editFlags` state defaults |
| `src/lib/itemTypeUtils.ts` | Add `is_component` to `ItemTypeFlags` interface |
| `src/pages/NewAssembly.tsx` | Filter `availableComponents` to only show items whose `item_type_id` maps to an item type with `is_component = true`. Use the `useItemTypes` hook (already imported) to get component type IDs, then filter `inventoryItems` by checking if the item's `item_type_id` is in that set. Requires joining `item_type_id` in the inventory query's `item_details` select. |

**Assembly filter logic (NewAssembly.tsx):**
- Expand the `item_details` select in the inventory query to include `item_type_id`
- In `availableComponents` memo, compute `componentTypeIds` from `itemTypes.filter(t => t.is_component).map(t => t.id)`
- Add filter: `inv.item_detail.item_type_id` must be in `componentTypeIds`

