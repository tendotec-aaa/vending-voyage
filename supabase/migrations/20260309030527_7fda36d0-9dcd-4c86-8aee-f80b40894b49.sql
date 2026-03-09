
ALTER TABLE public.spots ADD COLUMN rent_fixed_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.spots ADD COLUMN rent_percentage numeric NOT NULL DEFAULT 0;
