
-- 1. Add fields to warehouses table
ALTER TABLE public.warehouses
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text;

-- 2. Create receiving_notes table
CREATE TABLE public.receiving_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  purchase_item_id uuid NOT NULL REFERENCES public.purchase_items(id) ON DELETE CASCADE,
  quantity_expected integer NOT NULL,
  quantity_received integer NOT NULL,
  difference integer NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.receiving_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON public.receiving_notes
  FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow insert for authenticated" ON public.receiving_notes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow update for authenticated" ON public.receiving_notes
  FOR UPDATE USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow delete for authenticated" ON public.receiving_notes
  FOR DELETE USING (auth.role() = 'authenticated'::text);

-- 3. Create receiving_allocations table
CREATE TABLE public.receiving_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  purchase_item_id uuid NOT NULL REFERENCES public.purchase_items(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.receiving_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON public.receiving_allocations
  FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow insert for authenticated" ON public.receiving_allocations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow update for authenticated" ON public.receiving_allocations
  FOR UPDATE USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow delete for authenticated" ON public.receiving_allocations
  FOR DELETE USING (auth.role() = 'authenticated'::text);

-- 4. Seed the system warehouse for unaccounted inventory
INSERT INTO public.warehouses (name, is_system, description)
VALUES ('Unaccounted Inventory', true, 'System warehouse for items that were not accounted for during receiving. Do not delete.')
ON CONFLICT DO NOTHING;
