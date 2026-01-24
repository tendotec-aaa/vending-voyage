-- Enable RLS on all tables that don't have it yet
ALTER TABLE public.item_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_inventory ENABLE ROW LEVEL SECURITY;

-- LOCATIONS policies
CREATE POLICY "Allow insert for authenticated" ON public.locations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.locations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.locations FOR DELETE TO authenticated USING (true);

-- MACHINES policies
CREATE POLICY "Allow insert for authenticated" ON public.machines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.machines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.machines FOR DELETE TO authenticated USING (true);

-- PROFILES policies
CREATE POLICY "Allow read for authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.profiles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.profiles FOR DELETE TO authenticated USING (true);

-- ITEM_DEFINITIONS policies
CREATE POLICY "Allow read for authenticated" ON public.item_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.item_definitions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.item_definitions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.item_definitions FOR DELETE TO authenticated USING (true);

-- MACHINE_SLOTS policies
CREATE POLICY "Allow read for authenticated" ON public.machine_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.machine_slots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.machine_slots FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.machine_slots FOR DELETE TO authenticated USING (true);

-- PURCHASE_LINES policies
CREATE POLICY "Allow read for authenticated" ON public.purchase_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.purchase_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.purchase_lines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.purchase_lines FOR DELETE TO authenticated USING (true);

-- PURCHASES policies
CREATE POLICY "Allow read for authenticated" ON public.purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.purchases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.purchases FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.purchases FOR DELETE TO authenticated USING (true);

-- SETUPS policies
CREATE POLICY "Allow read for authenticated" ON public.setups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.setups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.setups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.setups FOR DELETE TO authenticated USING (true);

-- SPOTS policies
CREATE POLICY "Allow read for authenticated" ON public.spots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.spots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.spots FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.spots FOR DELETE TO authenticated USING (true);

-- SUPPLIERS policies
CREATE POLICY "Allow read for authenticated" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.suppliers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.suppliers FOR DELETE TO authenticated USING (true);

-- SPOT_VISITS policies
CREATE POLICY "Allow read for authenticated" ON public.spot_visits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.spot_visits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.spot_visits FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.spot_visits FOR DELETE TO authenticated USING (true);

-- VISIT_LINE_ITEMS policies
CREATE POLICY "Allow read for authenticated" ON public.visit_line_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.visit_line_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.visit_line_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.visit_line_items FOR DELETE TO authenticated USING (true);

-- WAREHOUSE_INVENTORY policies
CREATE POLICY "Allow read for authenticated" ON public.warehouse_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.warehouse_inventory FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.warehouse_inventory FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.warehouse_inventory FOR DELETE TO authenticated USING (true);