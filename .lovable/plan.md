

## Item Type Filtering for Item Analytics

### Changes Required

**1. `src/hooks/useItemAnalytics.tsx`**
- Add `itemTypeId: string` to `ItemPerformanceRow` interface
- Expand the item query to fetch items where `is_sellable = true` OR `is_component = true` (currently only sellable). This requires two queries OR removing the inner join filter and doing client-side filtering since Supabase doesn't support OR across joined tables easily. Simplest: fetch `item_details` with `item_types` fields (no inner filter), then client-side filter for `is_sellable || is_component`.
- Populate `itemTypeId` on each row from `item.item_type_id`
- Remove the Top Notch computation from the hook (move it to the page so it can be recalculated on filtered data)

**2. `src/pages/ItemAnalytics.tsx`**
- Import `useItemTypes` hook to get the list of item types
- Import `useSearchParams` from react-router-dom for URL persistence
- Add an "Item Type" `Select` dropdown next to month/year pickers, populated with types where `is_sellable || is_component`, plus an "All" option
- Read/write selected type ID to/from URL search param `?type=<id>`
- Filter `rows` by `itemTypeId` when a specific type is selected
- Recompute Top Notch badges on the **filtered** list (ROI > 300% AND velocity >= 80th percentile of filtered items)
- Update item count badge to reflect filtered count

### No database changes needed

All data already available. This is purely a frontend filtering enhancement.

