
CREATE TABLE public.user_location_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, location_id)
);

ALTER TABLE public.user_location_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can select" ON public.user_location_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert" ON public.user_location_assignments FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can delete" ON public.user_location_assignments FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
