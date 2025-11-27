-- Allow public viewing of debates (but not evidence)
DROP POLICY IF EXISTS "Participants can view their debates" ON public.debates;

-- Create new policy for authenticated users to view their debates
CREATE POLICY "Participants can view their debates"
  ON public.debates
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = debater1_id) OR (auth.uid() = debater2_id)
  );

-- Create new policy for public viewing of debates
CREATE POLICY "Public can view all active debates"
  ON public.debates
  FOR SELECT
  TO anon
  USING (
    deleted_at IS NULL AND status = 'active'
  );