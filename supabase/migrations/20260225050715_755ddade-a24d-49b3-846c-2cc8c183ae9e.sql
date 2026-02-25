
-- Drop restrictive policies on item_types
DROP POLICY IF EXISTS "Allow delete for authenticated" ON public.item_types;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.item_types;
DROP POLICY IF EXISTS "Allow select for authenticated" ON public.item_types;
DROP POLICY IF EXISTS "Allow update for authenticated" ON public.item_types;

-- Recreate as PERMISSIVE
CREATE POLICY "Allow select for authenticated" ON public.item_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.item_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.item_types FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.item_types FOR DELETE TO authenticated USING (true);

-- Also fix assemblies and assembly_components which have the same issue
DROP POLICY IF EXISTS "Allow delete for authenticated" ON public.assemblies;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.assemblies;
DROP POLICY IF EXISTS "Allow select for authenticated" ON public.assemblies;
DROP POLICY IF EXISTS "Allow update for authenticated" ON public.assemblies;

CREATE POLICY "Allow select for authenticated" ON public.assemblies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.assemblies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.assemblies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.assemblies FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow delete for authenticated" ON public.assembly_components;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.assembly_components;
DROP POLICY IF EXISTS "Allow select for authenticated" ON public.assembly_components;
DROP POLICY IF EXISTS "Allow update for authenticated" ON public.assembly_components;

CREATE POLICY "Allow select for authenticated" ON public.assembly_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.assembly_components FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.assembly_components FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.assembly_components FOR DELETE TO authenticated USING (true);
