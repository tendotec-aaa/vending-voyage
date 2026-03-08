

## Bug Root Cause Analysis

**Three interconnected bugs caused the data corruption:**

### Bug 1 — Frontend Cache Poisoning (`NewVisitReport.tsx`, line 626)

```
toyId: cs.toyId || slot.toyId,
```

The form auto-caches to localStorage on every change. When the operator opens a new visit for the same spot, the cache overlay restores `toyId` from the **previous** form session. If the slot's product was swapped between visits, the cached `toyId` is stale — it points to the OLD product (SLIME BLANDIBLUE) instead of the CURRENT one (POKEMON 55MM).

Meanwhile, `previousProductId` (line 587) is always freshly initialized from `slot.current_product_id` and is **never** restored from cache. This created the mismatch:
- `toyId` = SLIME (stale cache) 
- `previousProductId` = POKEMON (fresh from DB)

**Evidence:** The snapshot correctly recorded `previous_product_id` = POKEMON (from `previousProductId`), but the ledger and line items used `toyId` = SLIME.

### Bug 2 — Edge Function Overwrites `current_product_id` (line 348)

```typescript
} else {
  if (s.toyId) updateData.current_product_id = s.toyId;
```

During a normal (non-swap, non-installation) visit, the edge function **rewrites** `machine_slots.current_product_id` with the stale `toyId`. This corrupted the slot from POKEMON to SLIME. The slot now shows `current_product_id = SLIME` and `current_stock = -120` (because the ledger recorded sales/removals against the wrong item).

For routine visits, `current_product_id` should NEVER be touched — only installations and swaps change the product.

### Bug 3 — No Safety Net in Edge Function Normal Flow

The normal flow uses `s.toyId` everywhere (lines 517, 549, 564, 602-604) instead of the more authoritative `s.previousProductId || s.toyId`. Even without the cache bug, this is fragile.

---

## Fix Plan (3 files, no migrations)

### 1. `src/pages/NewVisitReport.tsx` (line 626)

**Remove `toyId` from cache restoration.** The product identity must always come fresh from the DB, never from stale cache. Also remove `toyName` cache restore since it follows `toyId`.

Change the cache overlay block to remove lines that restore `toyId` and `toyName`:
```typescript
// REMOVED: toyId: cs.toyId || slot.toyId,
// REMOVED: toyName cache restore
// Keep all other restorable fields (unitsSold, unitsRefilled, etc.)
```

### 2. `supabase/functions/submit-visit-report/index.ts` — machine_slots update (lines 346-352)

Only set `current_product_id` during **installation** visits. For routine/audit/maintenance visits, the product does not change:

```typescript
} else {
  if (visitType === "installation") {
    if (s.toyId) updateData.current_product_id = s.toyId;
    updateData.capacity = s.capacity;
    updateData.coin_acceptor = s.pricePerUnit;
  }
}
```

### 3. `supabase/functions/submit-visit-report/index.ts` — normal flow product ID (lines 506-615)

Add a safety net: derive the authoritative product ID from `previousProductId` first, falling back to `toyId`:

```typescript
// === NORMAL (NON-SWAP) FLOW ===
const productId = s.previousProductId || s.toyId;
if (!productId) continue;
```

Then replace all `s.toyId` references in the normal flow (slot ledger entries and warehouse ledger entries) with `productId`. This ensures even if `toyId` is stale, the correct product from the DB-sourced snapshot is used.

### Files Modified

| File | Change |
|------|--------|
| `src/pages/NewVisitReport.tsx` | Remove `toyId`/`toyName` from cache overlay (line 626-628) |
| `supabase/functions/submit-visit-report/index.ts` | Guard `current_product_id` update to installation-only (line 348); use `previousProductId \|\| toyId` in normal flow (lines 507-614) |

