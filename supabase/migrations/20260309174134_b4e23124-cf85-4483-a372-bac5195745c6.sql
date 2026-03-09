-- Grant table-level privileges on user_location_assignments
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_location_assignments TO authenticated;
GRANT SELECT ON public.user_location_assignments TO anon;