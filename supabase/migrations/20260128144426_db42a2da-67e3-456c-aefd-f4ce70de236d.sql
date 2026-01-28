-- Drop existing restrictive policies on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;

-- Recreate as PERMISSIVE policies (default behavior)
-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.user_profiles 
FOR SELECT 
USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (id = auth.uid());

-- Users can insert their own profile (for trigger-created profiles)
CREATE POLICY "Users can insert own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" 
ON public.user_profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles" 
ON public.user_profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));