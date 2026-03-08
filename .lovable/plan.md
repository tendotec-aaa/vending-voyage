

## Problem

The sales page returns **403 "permission denied for table sales"**. The migration created the `sales` and `sale_items` tables with RLS policies, but never ran `GRANT` statements to give the `anon` and `authenticated` roles access to the tables. PostgreSQL requires both:
1. Table-level `GRANT` (allows the role to attempt the operation)
2. RLS policy (filters which rows are visible)

Without the GRANT, no query can even reach the RLS layer.

## Fix (1 migration)

Run a single migration with GRANT statements for both tables:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO anon, authenticated;
```

This matches how every other table in the project is set up. The existing RLS policies already restrict deletes to admins and allow authenticated users to select/insert/update — so no security gap.

No frontend changes needed.

