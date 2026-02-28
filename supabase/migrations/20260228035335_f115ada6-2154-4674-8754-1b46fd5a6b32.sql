
ALTER TABLE public.spot_visits
  ADD COLUMN days_since_last_visit integer DEFAULT NULL,
  ADD COLUMN monthly_rent_per_spot numeric DEFAULT NULL,
  ADD COLUMN rent_since_last_visit numeric DEFAULT NULL;
