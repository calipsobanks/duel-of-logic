-- Drop the existing restrictive policy for viewing evidence
DROP POLICY IF EXISTS "Debate participants can view evidence" ON evidence;

-- Create new policy that allows all authenticated users to view evidence
CREATE POLICY "Anyone can view evidence in active debates"
ON evidence
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM debates
    WHERE debates.id = evidence.debate_id
    AND debates.deleted_at IS NULL
  )
);

-- Keep the insert/update policies restricted to participants only
-- (These policies already exist, just documenting the security model)