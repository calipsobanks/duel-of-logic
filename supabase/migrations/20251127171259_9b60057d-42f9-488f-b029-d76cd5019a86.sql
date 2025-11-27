-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Create new policy allowing public to view profiles (for shared discussion pages)
CREATE POLICY "Public can view all profiles"
ON public.profiles
FOR SELECT
USING (true);

-- Keep the update and insert policies as they were
-- Users can still only update and insert their own profiles