

## Phased Zero-Breakage Item Logic Migration

### Overview

Migrate from the hardcoded `item_details.type` enum (`merchandise`, `machine_model`, `spare_part`, `supply`) to the existing `item_types` table with new boolean flag columns. All current behavior preserved via backfill; new flags unlock dynamic filtering.

---

### Phase 1: Database Migration

**Single migration that:**

1. Adds 4 boolean columns to `item_types`: `is_routable`, `is_sellable`, `is_asset`, `is_supply` (all default `false`)
2. Upserts standard item types with correct flags:
   - "Merchandise" -> `is_routable = true, is_sellable = true`
   - "Machine" -> `is_asset = true`
   - "Spare Part" -> `is_supply = true`
   - "Supply" -> `is_supply = true`
3. Backfills `item_details.item_type_id` for any items missing it, based on their `type` enum:
   - `merchandise` -> Merchandise type id
   - `machine_model` -> Machine type id
   - `spare_part` -> Spare Part type id
   - `supply` -> Supply type id

```sql
ALTER TABLE public.item_types
  ADD COLUMN IF NOT EXISTS is_routable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_sellable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_asset boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_supply boolean NOT NULL DEFAULT false;

-- Upsert standard types
INSERT INTO public.item_types (name, is_routable, is_sellable, is_asset, is_supply)
VALUES
  ('Merchandise', true, true, false, false),
  ('Machine', false, false, true, false),
  ('Spare Part', false, false, false, true),
  ('Supply', false, false, false, true)
ON CONFLICT (name) DO UPDATE SET
  is_routable = EXCLUDED.is_routable,
  is_sellable = EXCLUDED.is_sellable,
  is_asset = EXCLUDED.is_asset,
  is_supply = EXCLUDED.is_supply;

-- Backfill item_details.item_type_id where null
UPDATE public.item_details SET item_type_id = (SELECT id FROM public.item_types WHERE name = 'Merchandise') WHERE type = 'merchandise' AND item_type_id IS NULL;
UPDATE public.item_details SET item_type_id = (SELECT id FROM public.item_types WHERE name = 'Machine') WHERE type = 'machine_model' AND item_type_id IS NULL;
UPDATE public.item_details SET item_type_id = (SELECT id FROM public.item_types WHERE name = 'Spare Part') WHERE type = 'spare_part' AND item_type_id IS NULL;
UPDATE public.item_details SET item_type_id = (SELECT id FROM public.item_types WHERE name = 'Supply') WHERE type = 'supply' AND item_type_id IS NULL;
```

Note: `item_types.name` has a unique constraint already (from the existing table). If it doesn't, one will be added.

---

### Phase 2: Remove Hardcoded Creation Logic

**Files modified:**

| File | Change |
|------|--------|
| `src/hooks/usePurchases.tsx` (line 172) | Remove `type: "merchandise"` from the `insertData`. Instead, look up the item_type's corresponding enum value via a helper, or default to `"merchandise"` if the item_type has `is_sellable = true`. Keep the `type` column populated for backward compat until full deprecation. |
| `src/hooks/useAssemblies.tsx` (line 41) | Same pattern: derive `type` from the selected `item_type_id`'s flags instead of hardcoding `"merchandise"` |
| `src/hooks/useWarehouseInventory.tsx` (line ~175) | Same: `createItemDetailMutation` should accept `item_type_id` and derive `type` |
| `src/lib/skuGenerator.ts` | Update `insertItemDetailWithRetrySku` to accept `item_type_id` in the insert data (already does via spread, no change needed) |

**Deriving `type` from flags** (backward compat helper):
```typescript
function deriveEnumType(itemType: { is_asset: boolean; is_supply: boolean; is_routable: boolean }): string {
  if (itemType.is_asset) return "machine_model";
  if (itemType.is_supply) return "spare_part";
  return "merchandise"; // default for routable/sellable
}
```

This keeps the old `type` enum column populated so existing RLS, views, and edge functions don't break.

---

### Phase 3: Update Frontend Filters

| File | Current Filter | New Filter |
|------|---------------|------------|
| `src/pages/Inventory.tsx` (line 38) | `.in("type", ["merchandise", "machine_model"])` | Join to `item_types` and filter where `is_sellable = true OR is_asset = true OR is_supply = true` (shows supplies now) |
| `src/pages/NewVisitReport.tsx` (line 375) | `.eq('type', 'merchandise')` | Filter by joining `item_types` via `item_type_id` where `is_routable = true` |
| `src/components/routes/PlannedSwapDialog.tsx` (line 83) | `.eq("type", "merchandise")` | Same: filter by `item_types.is_routable = true` via join |
| `src/pages/ItemDetail.tsx` (line 989) | `item.type === "merchandise"` | Check if the item's linked `item_type` has `is_sellable = true` |
| `src/pages/ItemDetail.tsx` (line 34-38) | `typeColors` keyed by enum | Keep for backward compat, also support flag-based badge display |

**Supabase query pattern for flag-based filtering:**

Since Supabase JS doesn't support filtering on joined table columns directly, we'll use a two-step approach:
1. First fetch `item_type` ids where the flag is true
2. Then filter `item_details` by `.in("item_type_id", routableTypeIds)`

Or use an RPC/view. The simplest approach: fetch all `item_types` once (small table), compute the ID sets client-side, then filter.

---

### Phase 4: Update `useItemTypes` Hook

Add the new boolean fields to the `ItemType` interface and query:

```typescript
export interface ItemType {
  id: string;
  name: string;
  is_routable: boolean;
  is_sellable: boolean;
  is_asset: boolean;
  is_supply: boolean;
  created_at: string;
}
```

---

### Modified Files Summary

| File | Change |
|------|--------|
| `supabase/migrations/...` | New migration: add columns, seed, backfill |
| `src/hooks/useItemTypes.tsx` | Add flag fields to interface and query |
| `src/hooks/usePurchases.tsx` | Derive `type` from `item_type_id` flags instead of hardcoding |
| `src/hooks/useAssemblies.tsx` | Same derivation |
| `src/hooks/useWarehouseInventory.tsx` | Same for `createItemDetailMutation` |
| `src/pages/Inventory.tsx` | Filter by item_type flags instead of enum |
| `src/pages/NewVisitReport.tsx` | Filter by `is_routable` instead of `type = merchandise` |
| `src/components/routes/PlannedSwapDialog.tsx` | Filter by `is_routable` instead of `type = merchandise` |
| `src/pages/ItemDetail.tsx` | Use `is_sellable` flag for sell-through chart visibility |
| `src/integrations/supabase/types.ts` | Auto-updated by Supabase after migration |

### Safety Guarantees

- The `type` enum column on `item_details` is **not removed** -- it stays populated via the derivation helper for backward compat with views, edge functions, and any SQL that references it
- All existing items get their `item_type_id` backfilled to match their current enum, so no behavior changes
- The old `typeColors` map in ItemDetail.tsx is kept; flag-based logic is additive

