
-- Grant table-level privileges to service_role, authenticated, and anon on all tables used by submit-visit-report
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spot_visits TO service_role, authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visit_slot_snapshots TO service_role, authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visit_line_items TO service_role, authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_slots TO service_role, authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO service_role, authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_adjustments TO service_role, authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_tickets TO service_role, authenticated, anon;
