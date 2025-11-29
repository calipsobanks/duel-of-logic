-- Drop the problematic policy
DROP POLICY IF EXISTS "Participants can view all participants in their discussions" ON group_discussion_participants;

-- Create a security definer function to check if user is a participant
CREATE OR REPLACE FUNCTION public.is_discussion_participant(_discussion_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_discussion_participants
    WHERE discussion_id = _discussion_id
      AND user_id = _user_id
  )
$$;

-- Create new policy using the function
CREATE POLICY "Participants can view all participants in their discussions"
ON group_discussion_participants
FOR SELECT
USING (public.is_discussion_participant(discussion_id, auth.uid()));

-- Fix the evidence policies too to avoid potential recursion
DROP POLICY IF EXISTS "Participants can view evidence in their discussions" ON group_evidence;
DROP POLICY IF EXISTS "Participants can insert evidence" ON group_evidence;

CREATE POLICY "Participants can view evidence in their discussions"
ON group_evidence
FOR SELECT
USING (public.is_discussion_participant(discussion_id, auth.uid()));

CREATE POLICY "Participants can insert evidence"
ON group_evidence
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND public.is_discussion_participant(discussion_id, auth.uid())
);

-- Fix the responses policies
DROP POLICY IF EXISTS "Participants can view responses in their discussions" ON group_evidence_responses;
DROP POLICY IF EXISTS "Participants can add responses" ON group_evidence_responses;

CREATE POLICY "Participants can view responses in their discussions"
ON group_evidence_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_evidence e
    WHERE e.id = evidence_id
      AND public.is_discussion_participant(e.discussion_id, auth.uid())
  )
);

CREATE POLICY "Participants can add responses"
ON group_evidence_responses
FOR INSERT
WITH CHECK (
  auth.uid() = respondent_id
  AND EXISTS (
    SELECT 1 FROM group_evidence e
    WHERE e.id = evidence_id
      AND public.is_discussion_participant(e.discussion_id, auth.uid())
  )
);