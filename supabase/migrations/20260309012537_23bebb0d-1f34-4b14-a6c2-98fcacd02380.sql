ALTER TABLE public.item_types ADD COLUMN IF NOT EXISTS is_component boolean NOT NULL DEFAULT false;
UPDATE public.item_types SET is_component = true WHERE name IN ('Spare Part', 'Supply');