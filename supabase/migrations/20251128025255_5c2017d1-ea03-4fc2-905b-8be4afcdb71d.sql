-- Drop the existing policy
DROP POLICY IF EXISTS "Public can view all active debates" ON debates;

-- Create a new policy that explicitly allows all authenticated users to view active debates
CREATE POLICY "Authenticated users can view all active debates"
ON debates
FOR SELECT
TO authenticated
USING (deleted_at IS NULL AND status = 'active');