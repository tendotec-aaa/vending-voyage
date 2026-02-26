-- Grant table-level permissions for inventory_ledger to service_role
GRANT ALL ON TABLE public.inventory_ledger TO service_role;

-- Also grant to authenticated for client-side ledger operations (receiving, assemblies)
GRANT SELECT, INSERT ON TABLE public.inventory_ledger TO authenticated;

-- Grant to anon for completeness
GRANT SELECT ON TABLE public.inventory_ledger TO anon;