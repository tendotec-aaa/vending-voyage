
-- Create expense_category enum
CREATE TYPE public.expense_category AS ENUM (
  'payroll', 'fuel', 'maintenance', 'location_commission', 'software_utilities', 'misc'
);

-- Create operating_expenses table
CREATE TABLE public.operating_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category expense_category NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.operating_expenses ENABLE ROW LEVEL SECURITY;

-- SELECT: users with view_profits permission OR admins
CREATE POLICY "Users with view_profits can select operating_expenses"
ON public.operating_expenses FOR SELECT TO authenticated
USING (
  has_permission(auth.uid(), 'view_profits') OR has_role(auth.uid(), 'admin')
);

-- INSERT: users with manage_expenses permission OR admins
CREATE POLICY "Users with manage_expenses can insert operating_expenses"
ON public.operating_expenses FOR INSERT TO authenticated
WITH CHECK (
  has_permission(auth.uid(), 'manage_expenses') OR has_role(auth.uid(), 'admin')
);

-- UPDATE: users with manage_expenses permission OR admins
CREATE POLICY "Users with manage_expenses can update operating_expenses"
ON public.operating_expenses FOR UPDATE TO authenticated
USING (
  has_permission(auth.uid(), 'manage_expenses') OR has_role(auth.uid(), 'admin')
);

-- DELETE: admins only
CREATE POLICY "Admins can delete operating_expenses"
ON public.operating_expenses FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin')
);
