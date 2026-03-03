
-- Add swap_out and swap_in to visit_action_type enum
ALTER TYPE public.visit_action_type ADD VALUE IF NOT EXISTS 'swap_out';
ALTER TYPE public.visit_action_type ADD VALUE IF NOT EXISTS 'swap_in';

-- Create stock_discrepancy table
CREATE TABLE public.stock_discrepancy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_detail_id uuid NOT NULL REFERENCES public.item_details(id) ON DELETE CASCADE,
  detected_at timestamptz NOT NULL DEFAULT now(),
  occurrence_date date NOT NULL DEFAULT CURRENT_DATE,
  discrepancy_type text NOT NULL DEFAULT 'system',
  expected_quantity integer NOT NULL,
  actual_quantity integer NOT NULL,
  difference integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  resolved_at timestamptz,
  resolved_by uuid,
  adjustment_id uuid REFERENCES public.inventory_adjustments(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_discrepancy ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow select for authenticated"
ON public.stock_discrepancy FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow insert for authenticated"
ON public.stock_discrepancy FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated"
ON public.stock_discrepancy FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow delete for authenticated"
ON public.stock_discrepancy FOR DELETE
TO authenticated
USING (true);
