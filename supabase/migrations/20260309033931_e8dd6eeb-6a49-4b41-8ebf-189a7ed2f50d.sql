
ALTER TYPE public.expense_category ADD VALUE IF NOT EXISTS 'rent';
ALTER TYPE public.expense_category ADD VALUE IF NOT EXISTS 'depreciation';

CREATE TABLE public.overhead_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month text NOT NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  setup_id uuid REFERENCES public.setups(id) ON DELETE CASCADE,
  expense_id uuid NOT NULL REFERENCES public.operating_expenses(id) ON DELETE CASCADE,
  posting_type text NOT NULL,
  posted_at timestamptz NOT NULL DEFAULT now(),
  posted_by uuid,
  UNIQUE(year_month, location_id, posting_type),
  UNIQUE(year_month, setup_id, posting_type)
);

ALTER TABLE public.overhead_postings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can select" ON public.overhead_postings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert" ON public.overhead_postings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can delete" ON public.overhead_postings FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
