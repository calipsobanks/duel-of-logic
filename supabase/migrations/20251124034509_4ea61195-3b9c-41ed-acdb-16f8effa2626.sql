-- Delete all profiles (this will cascade due to foreign key on user_roles if any)
DELETE FROM public.profiles;

-- Note: We cannot directly delete from auth.users via migration
-- You'll need to delete users through Supabase Dashboard or use the admin API