
-- Grant table-level privileges to authenticated role for all 3 tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_discrepancy TO authenticated;
GRANT SELECT, INSERT ON public.inventory_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
