
-- Create company_info table
CREATE TABLE public.company_info (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  trade_name text,
  tax_id text,
  registration_number text,
  country text,
  state_province text,
  city text,
  address text,
  postal_code text,
  phone text,
  email text,
  website text,
  default_currency text DEFAULT 'USD',
  logo_url text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users
CREATE POLICY "Authenticated users can view company info"
ON public.company_info FOR SELECT
USING (auth.role() = 'authenticated');

-- INSERT: admin only
CREATE POLICY "Admins can insert company info"
ON public.company_info FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- UPDATE: admin only
CREATE POLICY "Admins can update company info"
ON public.company_info FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- DELETE: admin only
CREATE POLICY "Admins can delete company info"
ON public.company_info FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_company_info_updated_at
BEFORE UPDATE ON public.company_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
