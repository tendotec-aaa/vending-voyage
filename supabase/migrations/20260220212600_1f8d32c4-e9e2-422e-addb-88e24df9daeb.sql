CREATE TABLE public.visit_slot_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.spot_visits(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES public.machine_slots(id) ON DELETE CASCADE,
  previous_product_id uuid,
  previous_stock integer NOT NULL DEFAULT 0,
  previous_capacity integer NOT NULL DEFAULT 150,
  previous_coin_acceptor numeric NOT NULL DEFAULT 1.00,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visit_slot_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON public.visit_slot_snapshots
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated" ON public.visit_slot_snapshots
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated" ON public.visit_slot_snapshots
  FOR DELETE USING (auth.role() = 'authenticated');