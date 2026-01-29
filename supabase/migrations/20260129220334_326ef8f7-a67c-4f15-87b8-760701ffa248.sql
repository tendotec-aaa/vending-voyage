-- Fix missing table privileges causing 403 "permission denied for table user_profiles"
-- Supabase/PostgREST requires explicit GRANTs to anon/authenticated roles.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_profiles TO authenticated;

-- (Optional but safe) Ensure the table owner can still manage it
GRANT ALL ON TABLE public.user_profiles TO postgres;