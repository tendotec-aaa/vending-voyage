
-- Add false_coins and jam_status columns to visit_line_items
ALTER TABLE public.visit_line_items
  ADD COLUMN false_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN jam_status text NOT NULL DEFAULT 'no_jam';
