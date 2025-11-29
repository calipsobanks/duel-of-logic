-- Add quote field to discussion_comments for source references
ALTER TABLE public.discussion_comments
ADD COLUMN source_quote TEXT;