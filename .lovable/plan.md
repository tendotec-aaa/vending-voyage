

## Fixed Overhead Generation & Historical Rent Ledger

### What We're Building

1. **"Generate Monthly Overhead" button** on the Profitability page that snapshots rent and depreciation as permanent `operating_expenses` rows
2. **Spot Health** updated to prefer posted expenses over live calculations, with "Projected" fallback
3. Two new enum values (`rent`, `depreciation`) for `expense_category`

### Database Changes

**Migration**: Add `rent` and `depreciation` to `expense_category` enum, plus a tracking table to prevent duplicate generation.

```sql
ALTER TYPE public.expense_category ADD VALUE IF NOT EXISTS 'rent';
ALTER TYPE public.expense_category ADD VALUE IF NOT EXISTS 'depreciation';

CREATE TABLE public.overhead_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month text NOT NULL,           -- '2026-03'
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  setup_id uuid REFERENCES public.setups(id) ON DELETE CASCADE,
  expense_id uuid NOT NULL REFERENCES public.operating_expenses(id) ON DELETE CASCADE,
  posting_type text NOT NULL,         -- 'rent' or 'depreciation'
  posted_at timestamptz NOT NULL DEFAULT now(),
  posted_by uuid,
  UNIQUE(year_month, location_id, posting_type),
  UNIQUE(year_month, setup_id, posting_type)
);

ALTER TABLE public.overhead_postings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can select" ON public.overhead_postings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert" ON public.overhead_postings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can delete" ON public.overhead_postings FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
```

### Generate Overhead Logic (`useProfitability` mutation)

New `generateOverhead` mutation:

1. Check `overhead_postings` for the selected `year_month` -- if rows exist, warn "already generated"
2. Fetch all active `locations` with `rent_amount` and `commission_percentage`
3. For each location with `rent_amount > 0`: insert into `operating_expenses` (category `rent`, description = location name, amount = `rent_amount`, date = 1st of month), then insert tracking row into `overhead_postings`
4. Fetch all active `setups` (where `spot_id IS NOT NULL`) with their machines' `item_details.monthly_depreciation`
5. For each setup with depreciation > 0: insert into `operating_expenses` (category `depreciation`, description = setup/spot name, amount = total dep), then insert tracking row
6. Invalidate profitability query

Commission percentage is **not** posted as overhead (it's variable, tied to revenue). Only the fixed `rent_amount` is snapshotted.

### Profitability Page Changes

- Add `'rent'` and `'depreciation'` to `ExpenseCategory` type, labels, and colors in `useProfitability.tsx`
- Add "Generate Monthly Overhead" button next to "Add Expense" (admin only)
- Show confirmation dialog before generating, with summary of what will be created
- If already posted for that month, show a badge "Overhead Posted" and disable the button

### Spot Health Integration

Update `useSpotHealth.tsx`:

1. Additionally fetch `operating_expenses` for the selected month where category = `rent` or `depreciation`, joined with `overhead_postings` to map back to `location_id` / `setup_id`
2. **If posted rows exist**: use the snapshotted amounts (rent per location split by active spots, depreciation per setup mapped to spot)
3. **If no posted rows**: fall back to current live calculation from `locations.rent_amount` and `item_details.monthly_depreciation`, and add an `isProjected: true` flag
4. Show a small "Projected" badge next to rent/depreciation values when using live data

### Files Modified

| File | Change |
|------|--------|
| `src/hooks/useProfitability.tsx` | Add `rent`/`depreciation` to types, add `generateOverhead` mutation, add `isOverheadPosted` query |
| `src/pages/Profitability.tsx` | Add "Generate Monthly Overhead" button with confirmation dialog |
| `src/hooks/useSpotHealth.tsx` | Prefer posted expenses, fallback to projected, add `isProjected` flag |
| `src/pages/SpotHealth.tsx` | Show "Projected" indicator when overhead not yet posted |

### Data Flow

```text
Admin clicks "Generate Monthly Overhead" for March 2026
  → For each Location: snapshot rent_amount → operating_expenses (rent)
  → For each Setup: snapshot machine depreciation → operating_expenses (depreciation)
  → Track in overhead_postings (prevents duplicates)

Profitability P&L reads operating_expenses → rent & depreciation appear automatically

Spot Health checks overhead_postings:
  → Posted? Use snapshotted amounts from operating_expenses
  → Not posted? Show "Projected" values from location/setup master data
```

