
-- Drop restrictive policies and recreate as permissive for app_roles
DROP POLICY IF EXISTS "Authenticated can select app_roles" ON public.app_roles;
DROP POLICY IF EXISTS "Admins can insert app_roles" ON public.app_roles;
DROP POLICY IF EXISTS "Admins can update app_roles" ON public.app_roles;
DROP POLICY IF EXISTS "Admins can delete app_roles" ON public.app_roles;

CREATE POLICY "Authenticated can select app_roles" ON public.app_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert app_roles" ON public.app_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can update app_roles" ON public.app_roles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can delete app_roles" ON public.app_roles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

-- Same fix for role_permissions
DROP POLICY IF EXISTS "Authenticated can select role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can insert role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can update role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can delete role_permissions" ON public.role_permissions;

CREATE POLICY "Authenticated can select role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert role_permissions" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can update role_permissions" ON public.role_permissions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can delete role_permissions" ON public.role_permissions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

-- Same fix for user_assignments
DROP POLICY IF EXISTS "Authenticated can select user_assignments" ON public.user_assignments;
DROP POLICY IF EXISTS "Admins can insert user_assignments" ON public.user_assignments;
DROP POLICY IF EXISTS "Admins can update user_assignments" ON public.user_assignments;
DROP POLICY IF EXISTS "Admins can delete user_assignments" ON public.user_assignments;

CREATE POLICY "Authenticated can select user_assignments" ON public.user_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert user_assignments" ON public.user_assignments FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can update user_assignments" ON public.user_assignments FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can delete user_assignments" ON public.user_assignments FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

-- Also grant table-level permissions
GRANT SELECT ON public.app_roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_roles TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT SELECT ON public.user_assignments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_assignments TO authenticated;
