

## Plan: Category-Based SKU Generation with Uniqueness Guardrails

### Format

`{CategoryInitials}{SubcategoryInitials}-{6-digit-number}`

Examples:
- Category "Maquinas Vending", Subcategory "Juguetes Capsulas" → `MVJC-482910`
- No category/subcategory → `XX-482910`

### Changes

#### 1. `src/lib/skuGenerator.ts` — Rewrite utility

Replace current contents with:
- `generateCode(name)` — first letter of each word, uppercased, max 2 chars
- `generateSkuCode(categoryName?, subcategoryName?)` — combines `generateCode` outputs + random 6-digit number
- `insertItemDetailWithRetrySku(supabase, insertData, categoryName?, subcategoryName?)` — wraps the INSERT in a retry loop (max 3 attempts). On unique constraint violation (`23505`), regenerates the SKU and retries. Returns the created row.

This is the **single function** all item creation flows will call, guaranteeing uniqueness at the DB level with automatic retry.

#### 2. `src/pages/NewPurchase.tsx` (lines 83, 103)

- Import `generateSkuCode` from `skuGenerator.ts`
- Replace `Date.now().toString(36).toUpperCase()` with `generateSkuCode()` for initial/preview SKUs (these are placeholders before DB insert)
- The actual uniqueness is enforced in `usePurchases.tsx` at insert time

#### 3. `src/hooks/usePurchases.tsx` (line 168-172)

- Import `insertItemDetailWithRetrySku` from `skuGenerator.ts`
- Replace the manual `supabase.from("item_details").insert(...)` block with `insertItemDetailWithRetrySku(supabase, insertData, categoryName, subcategoryName)`
- Need to look up category/subcategory names from IDs using the categories already fetched or a quick query

#### 4. `src/hooks/useWarehouseInventory.tsx` (line 193)

- Import `insertItemDetailWithRetrySku`
- Replace manual insert with retry-safe helper
- Pass category/subcategory names (will need to accept them as params or look them up)

#### 5. `src/hooks/useAssemblies.tsx` (line 38)

- Import `insertItemDetailWithRetrySku`
- Replace manual insert with retry-safe helper

### Uniqueness Guarantee

1. **DB constraint** `item_definitions_sku_key` (UNIQUE on `sku`) — already exists, prevents duplicates at DB level
2. **Retry loop** — on constraint violation error code `23505`, regenerate random suffix and retry up to 3 times
3. **Single insert helper** — all 3 hooks use the same function, no duplicate logic

### Files Modified

- `src/lib/skuGenerator.ts` — rewrite
- `src/pages/NewPurchase.tsx` — 2 line changes
- `src/hooks/usePurchases.tsx` — replace item_details insert block
- `src/hooks/useWarehouseInventory.tsx` — replace item_details insert block
- `src/hooks/useAssemblies.tsx` — replace item_details insert block

