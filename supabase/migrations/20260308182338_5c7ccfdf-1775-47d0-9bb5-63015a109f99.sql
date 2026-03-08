-- Fix table-level privileges so authenticated users can access routes planner tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.routes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.route_stops TO authenticated;

-- Keep backend/service operations functional
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.routes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.route_stops TO service_role;