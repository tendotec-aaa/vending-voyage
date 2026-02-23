
-- 1. Create inventory_adjustments table for shortage/surplus audit trail
CREATE TABLE public.inventory_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id uuid NOT NULL REFERENCES public.spot_visits(id) ON DELETE CASCADE,
  item_detail_id uuid NOT NULL REFERENCES public.item_details(id),
  slot_id uuid NOT NULL REFERENCES public.machine_slots(id),
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('shortage', 'surplus')),
  expected_quantity integer NOT NULL,
  actual_quantity integer NOT NULL,
  difference integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow read for authenticated" ON public.inventory_adjustments
  FOR SELECT USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Allow insert for authenticated" ON public.inventory_adjustments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Allow delete for authenticated" ON public.inventory_adjustments
  FOR DELETE USING (auth.role() = 'authenticated'::text);

-- 2. Add photo_url column to visit_line_items for swap evidence
ALTER TABLE public.visit_line_items ADD COLUMN photo_url text;
