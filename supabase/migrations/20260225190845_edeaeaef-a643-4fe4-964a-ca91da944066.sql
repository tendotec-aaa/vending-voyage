
-- Fix inventory_ledger RLS: existing policies are RESTRICTIVE, need PERMISSIVE ones
-- Drop the restrictive policies and recreate as permissive

DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.inventory_ledger;
DROP POLICY IF EXISTS "Allow read for authenticated" ON public.inventory_ledger;

CREATE POLICY "Allow read for authenticated"
ON public.inventory_ledger
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow insert for authenticated"
ON public.inventory_ledger
FOR INSERT
TO authenticated
WITH CHECK (true);
