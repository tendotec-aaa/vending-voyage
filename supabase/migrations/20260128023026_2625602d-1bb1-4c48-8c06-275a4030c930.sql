-- Fix user_profiles RLS policies - they were created as RESTRICTIVE instead of PERMISSIVE
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;

-- Recreate as PERMISSIVE policies (the default, using CREATE POLICY without RESTRICTIVE)
CREATE POLICY "Users can view own profile" 
ON public.user_profiles 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can update own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" 
ON public.user_profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete profiles" 
ON public.user_profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));