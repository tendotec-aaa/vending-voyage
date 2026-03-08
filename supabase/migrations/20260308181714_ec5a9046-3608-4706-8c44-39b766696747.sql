
-- Drop the broken restrictive policies
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.routes;
DROP POLICY IF EXISTS "Enable all access for authenticated users on routes" ON public.routes;

-- Create a proper PERMISSIVE policy
CREATE POLICY "Allow all for authenticated users"
ON public.routes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Fix route_stops too (same issue)
DROP POLICY IF EXISTS "Allow all for authenticated stops" ON public.route_stops;
DROP POLICY IF EXISTS "Enable all access for authenticated users on route_stops" ON public.route_stops;

CREATE POLICY "Allow all for authenticated users"
ON public.route_stops
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
