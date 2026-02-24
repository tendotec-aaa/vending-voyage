
-- Add computed_current_stock to visit_line_items to store the exact current stock
-- calculated during visit submission, avoiding reverse-engineering from cash_collected
ALTER TABLE public.visit_line_items
ADD COLUMN computed_current_stock integer DEFAULT NULL;

-- Also add units_sold so the detail page doesn't need to recalculate
ALTER TABLE public.visit_line_items
ADD COLUMN units_sold integer DEFAULT NULL;

COMMENT ON COLUMN public.visit_line_items.computed_current_stock IS 'The exact current stock computed by the visit report form at submission time';
COMMENT ON COLUMN public.visit_line_items.units_sold IS 'The units sold value entered by the operator during the visit report';
