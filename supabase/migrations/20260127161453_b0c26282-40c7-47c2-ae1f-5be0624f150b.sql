-- Add warehouse_destination and local_tax_rate to purchases
ALTER TABLE public.purchases 
ADD COLUMN IF NOT EXISTS warehouse_destination text,
ADD COLUMN IF NOT EXISTS local_tax_rate numeric DEFAULT 0;

-- Add cbm to purchase_lines
ALTER TABLE public.purchase_lines
ADD COLUMN IF NOT EXISTS cbm numeric DEFAULT 0;

-- Create table for item-specific fees
CREATE TABLE public.purchase_line_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_line_id uuid REFERENCES public.purchase_lines(id) ON DELETE CASCADE NOT NULL,
  fee_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on purchase_line_fees
ALTER TABLE public.purchase_line_fees ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchase_line_fees
CREATE POLICY "Allow read for authenticated" ON public.purchase_line_fees
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated" ON public.purchase_line_fees
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated" ON public.purchase_line_fees
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated" ON public.purchase_line_fees
FOR DELETE USING (auth.role() = 'authenticated');

-- Create table for global fees
CREATE TABLE public.purchase_global_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
  fee_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  distribution_method text NOT NULL DEFAULT 'by_value' CHECK (distribution_method IN ('by_value', 'by_quantity', 'by_cbm')),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on purchase_global_fees
ALTER TABLE public.purchase_global_fees ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchase_global_fees
CREATE POLICY "Allow read for authenticated" ON public.purchase_global_fees
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated" ON public.purchase_global_fees
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated" ON public.purchase_global_fees
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated" ON public.purchase_global_fees
FOR DELETE USING (auth.role() = 'authenticated');

-- Create warehouses table
CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on warehouses
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- RLS policies for warehouses
CREATE POLICY "Allow read for authenticated" ON public.warehouses
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated" ON public.warehouses
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated" ON public.warehouses
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated" ON public.warehouses
FOR DELETE USING (auth.role() = 'authenticated');

-- Add warehouse_id to purchases (replacing warehouse_destination text)
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id);