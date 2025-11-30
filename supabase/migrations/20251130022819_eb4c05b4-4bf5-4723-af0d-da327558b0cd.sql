-- Create table for AI debate evaluations
CREATE TABLE public.debate_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debate_id UUID NOT NULL,
  evaluation TEXT NOT NULL,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.debate_evaluations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view evaluations for debates they can see
CREATE POLICY "Users can view debate evaluations"
ON public.debate_evaluations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM debates
    WHERE debates.id = debate_evaluations.debate_id
    AND debates.deleted_at IS NULL
  )
);

-- Policy: System can insert evaluations
CREATE POLICY "System can insert evaluations"
ON public.debate_evaluations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_debate_evaluations_debate_id ON public.debate_evaluations(debate_id);
CREATE INDEX idx_debate_evaluations_created_at ON public.debate_evaluations(created_at DESC);