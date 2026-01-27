-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subcategories table linked to categories
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, category_id)
);

-- Add category and subcategory fields to item_definitions
ALTER TABLE public.item_definitions 
ADD COLUMN category_id UUID REFERENCES public.categories(id),
ADD COLUMN subcategory_id UUID REFERENCES public.subcategories(id);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON public.categories
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated" ON public.categories
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated" ON public.categories
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated" ON public.categories
FOR DELETE USING (auth.role() = 'authenticated');

-- Enable RLS on subcategories
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON public.subcategories
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated" ON public.subcategories
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated" ON public.subcategories
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated" ON public.subcategories
FOR DELETE USING (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX idx_subcategories_category_id ON public.subcategories(category_id);
CREATE INDEX idx_item_definitions_category_id ON public.item_definitions(category_id);
CREATE INDEX idx_item_definitions_subcategory_id ON public.item_definitions(subcategory_id);