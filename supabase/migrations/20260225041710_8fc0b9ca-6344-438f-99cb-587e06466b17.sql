
-- 1. Create item_types table
CREATE TABLE public.item_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.item_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for authenticated" ON public.item_types FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow insert for authenticated" ON public.item_types FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow update for authenticated" ON public.item_types FOR UPDATE USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow delete for authenticated" ON public.item_types FOR DELETE USING (auth.role() = 'authenticated'::text);

-- Seed default item types
INSERT INTO public.item_types (name) VALUES
  ('Machine Model'),
  ('Merchandise'),
  ('Spare Part'),
  ('Supply');

-- 2. Add item_type_id to item_details
ALTER TABLE public.item_details ADD COLUMN item_type_id UUID REFERENCES public.item_types(id);

-- Backfill existing rows
UPDATE public.item_details SET item_type_id = (SELECT id FROM public.item_types WHERE name = 'Machine Model') WHERE type = 'machine_model';
UPDATE public.item_details SET item_type_id = (SELECT id FROM public.item_types WHERE name = 'Merchandise') WHERE type = 'merchandise';
UPDATE public.item_details SET item_type_id = (SELECT id FROM public.item_types WHERE name = 'Spare Part') WHERE type = 'spare_part';
UPDATE public.item_details SET item_type_id = (SELECT id FROM public.item_types WHERE name = 'Supply') WHERE type = 'supply';

-- 3. Create assemblies table
CREATE TABLE public.assemblies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assembly_number TEXT NOT NULL,
  output_item_detail_id UUID REFERENCES public.item_details(id),
  output_quantity INTEGER NOT NULL DEFAULT 1,
  labor_cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  total_labor_cost NUMERIC NOT NULL DEFAULT 0,
  total_component_cost NUMERIC NOT NULL DEFAULT 0,
  final_unit_cost NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  warehouse_id UUID REFERENCES public.warehouses(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.assemblies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for authenticated" ON public.assemblies FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow insert for authenticated" ON public.assemblies FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow update for authenticated" ON public.assemblies FOR UPDATE USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow delete for authenticated" ON public.assemblies FOR DELETE USING (auth.role() = 'authenticated'::text);

-- 4. Create assembly_components table
CREATE TABLE public.assembly_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assembly_id UUID NOT NULL REFERENCES public.assemblies(id) ON DELETE CASCADE,
  item_detail_id UUID NOT NULL REFERENCES public.item_details(id),
  quantity_per_unit INTEGER NOT NULL DEFAULT 1,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assembly_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for authenticated" ON public.assembly_components FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow insert for authenticated" ON public.assembly_components FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow update for authenticated" ON public.assembly_components FOR UPDATE USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow delete for authenticated" ON public.assembly_components FOR DELETE USING (auth.role() = 'authenticated'::text);
