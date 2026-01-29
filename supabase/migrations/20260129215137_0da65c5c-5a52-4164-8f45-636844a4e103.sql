-- Recreate the handle_new_user_profile function with SECURITY DEFINER to bypass RLS
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