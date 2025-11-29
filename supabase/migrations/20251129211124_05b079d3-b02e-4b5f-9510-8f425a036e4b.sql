-- Add claim_evaluation column to track AI's assessment
ALTER TABLE public.discussion_comments
ADD COLUMN claim_evaluation TEXT;