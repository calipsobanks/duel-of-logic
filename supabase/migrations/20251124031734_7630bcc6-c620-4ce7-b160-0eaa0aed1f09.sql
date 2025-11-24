-- Drop the insecure public viewing policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a secure policy that requires authentication
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Add comment explaining the policy
COMMENT ON POLICY "Authenticated users can view all profiles" ON public.profiles IS 'Only authenticated users can view profile information to protect sensitive personal data';