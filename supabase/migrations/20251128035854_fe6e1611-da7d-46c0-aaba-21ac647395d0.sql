-- Create table for controversial topics
CREATE TABLE IF NOT EXISTS public.controversial_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  controversy TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  week_start DATE NOT NULL DEFAULT date_trunc('week', now())::date,
  CONSTRAINT unique_category_per_week UNIQUE (category, week_start)
);

-- Enable RLS
ALTER TABLE public.controversial_topics ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read topics
CREATE POLICY "Anyone can view controversial topics"
  ON public.controversial_topics
  FOR SELECT
  USING (true);

-- Create index for efficient weekly queries
CREATE INDEX idx_controversial_topics_week ON public.controversial_topics(week_start DESC);