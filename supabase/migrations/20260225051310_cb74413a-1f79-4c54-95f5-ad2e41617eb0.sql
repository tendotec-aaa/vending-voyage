-- Grant table privileges for newly added tables to match project access model
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON TABLE public.item_types TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON TABLE public.assemblies TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON TABLE public.assembly_components TO authenticated, anon, service_role;

-- Ensure the new FK column on item_details is fully writable/readable by API roles
GRANT SELECT, INSERT, UPDATE ON TABLE public.item_details TO authenticated, anon, service_role;

-- Keep RLS explicitly enabled
ALTER TABLE public.item_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assembly_components ENABLE ROW LEVEL SECURITY;