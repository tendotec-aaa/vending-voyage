
-- Sales header table
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text NOT NULL,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  buyer_name text,
  buyer_contact text,
  warehouse_id uuid REFERENCES public.warehouses(id),
  subtotal numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  notes text,
  currency text NOT NULL DEFAULT 'USD',
  paid boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sale line items table
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  item_detail_id uuid NOT NULL REFERENCES public.item_details(id),
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for sales
CREATE POLICY "Allow select for authenticated" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.sales FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update for authenticated" ON public.sales FOR UPDATE TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete for authenticated" ON public.sales FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- RLS policies for sale_items
CREATE POLICY "Allow select for authenticated" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update for authenticated" ON public.sale_items FOR UPDATE TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete for authenticated" ON public.sale_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
