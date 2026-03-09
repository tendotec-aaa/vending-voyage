
-- App Roles (dynamic, admin-created)
CREATE TABLE public.app_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- RLS for app_roles
CREATE POLICY "Authenticated can select app_roles" ON public.app_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert app_roles" ON public.app_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can update app_roles" ON public.app_roles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can delete app_roles" ON public.app_roles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

-- Permissions per role
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.app_roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  UNIQUE(role_id, permission_key)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS for role_permissions
CREATE POLICY "Authenticated can select role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert role_permissions" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can update role_permissions" ON public.role_permissions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can delete role_permissions" ON public.role_permissions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

-- Scope enum
CREATE TYPE public.assignment_scope AS ENUM ('global', 'location', 'personal');

-- User assignments
CREATE TABLE public.user_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.app_roles(id) ON DELETE CASCADE,
  scope_type public.assignment_scope NOT NULL DEFAULT 'global',
  scope_id uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.user_assignments ENABLE ROW LEVEL SECURITY;

-- RLS for user_assignments
CREATE POLICY "Authenticated can select user_assignments" ON public.user_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert user_assignments" ON public.user_assignments FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can update user_assignments" ON public.user_assignments FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can delete user_assignments" ON public.user_assignments FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

-- has_permission function
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_assignments ua
    JOIN public.role_permissions rp ON rp.role_id = ua.role_id
    WHERE ua.user_id = _user_id
      AND rp.permission_key = _perm_key
      AND rp.is_enabled = true
  )
$$;

-- get_user_scope function
CREATE OR REPLACE FUNCTION public.get_user_scope(_user_id uuid)
RETURNS TABLE(scope_type public.assignment_scope, scope_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ua.scope_type, ua.scope_id
  FROM public.user_assignments ua
  WHERE ua.user_id = _user_id
  LIMIT 1
$$;

-- Seed default roles
INSERT INTO public.app_roles (id, name, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Administrator', 'Full access to all features'),
  ('a0000000-0000-0000-0000-000000000002', 'Route Operator', 'Can manage routes and view stock'),
  ('a0000000-0000-0000-0000-000000000003', 'Warehouse Manager', 'Can manage warehouse inventory');

-- Seed all permission keys for all roles
-- Permission keys list
DO $$
DECLARE
  perm_keys text[] := ARRAY[
    'view_costs', 'view_profits', 'view_stock', 'edit_bodega',
    'view_all_routes', 'manage_own_route', 'manage_users',
    'view_analytics', 'manage_purchases', 'manage_sales', 'manage_maintenance'
  ];
  k text;
  admin_id uuid := 'a0000000-0000-0000-0000-000000000001';
  operator_id uuid := 'a0000000-0000-0000-0000-000000000002';
  manager_id uuid := 'a0000000-0000-0000-0000-000000000003';
BEGIN
  -- Admin: all enabled
  FOREACH k IN ARRAY perm_keys LOOP
    INSERT INTO public.role_permissions (role_id, permission_key, is_enabled)
    VALUES (admin_id, k, true);
  END LOOP;

  -- Route Operator: specific permissions
  FOREACH k IN ARRAY perm_keys LOOP
    INSERT INTO public.role_permissions (role_id, permission_key, is_enabled)
    VALUES (operator_id, k, k = ANY(ARRAY['view_stock', 'view_all_routes', 'manage_own_route']));
  END LOOP;

  -- Warehouse Manager: specific permissions
  FOREACH k IN ARRAY perm_keys LOOP
    INSERT INTO public.role_permissions (role_id, permission_key, is_enabled)
    VALUES (manager_id, k, k = ANY(ARRAY['view_stock', 'edit_bodega']));
  END LOOP;
END $$;

-- Backfill user_assignments from existing user_roles
INSERT INTO public.user_assignments (user_id, role_id, scope_type)
SELECT 
  ur.user_id,
  CASE ur.role
    WHEN 'admin' THEN 'a0000000-0000-0000-0000-000000000001'::uuid
    WHEN 'route_operator' THEN 'a0000000-0000-0000-0000-000000000002'::uuid
    WHEN 'warehouse_manager' THEN 'a0000000-0000-0000-0000-000000000003'::uuid
  END,
  'global'
FROM public.user_roles ur
ON CONFLICT (user_id) DO NOTHING;
