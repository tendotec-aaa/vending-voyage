-- Rename profiles table to user_profiles
ALTER TABLE public.profiles RENAME TO user_profiles;

-- Add new employee fields
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS first_names text,
  ADD COLUMN IF NOT EXISTS last_names text,
  ADD COLUMN IF NOT EXISTS personal_id_number text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS employed_since date,
  ADD COLUMN IF NOT EXISTS has_driver_license boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS driver_license_type text,
  ADD COLUMN IF NOT EXISTS driver_license_expiry_date date,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_number text,
  ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Drop old full_name column since we now have first_names and last_names
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS full_name;

-- Update RLS policies to use new table name (they will be automatically renamed)
-- Add policy for users to update their own profile
DROP POLICY IF EXISTS "Allow read for authenticated" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow update for authenticated" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow delete for authenticated" ON public.user_profiles;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (id = auth.uid());

-- Admins can update any profile
CREATE POLICY "Admins can update all profiles"
  ON public.user_profiles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON public.user_profiles
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger to auto-create user_profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, active, profile_completed)
  VALUES (
    NEW.id,
    NEW.email,
    false,  -- New users start inactive until admin approves
    false   -- Profile not completed yet
  );
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Update foreign key references in maintenance_tickets
ALTER TABLE public.maintenance_tickets 
  DROP CONSTRAINT IF EXISTS maintenance_tickets_reporter_id_fkey;

ALTER TABLE public.maintenance_tickets
  ADD CONSTRAINT maintenance_tickets_reporter_id_fkey 
  FOREIGN KEY (reporter_id) REFERENCES public.user_profiles(id);

-- Update foreign key references in spot_visits
ALTER TABLE public.spot_visits 
  DROP CONSTRAINT IF EXISTS spot_visits_operator_id_fkey;

ALTER TABLE public.spot_visits
  ADD CONSTRAINT spot_visits_operator_id_fkey 
  FOREIGN KEY (operator_id) REFERENCES public.user_profiles(id);