-- Add score tracking to discussion comments
ALTER TABLE public.discussion_comments
ADD COLUMN score INTEGER NOT NULL DEFAULT 0,
ADD COLUMN source_url TEXT,
ADD COLUMN source_type TEXT,
ADD COLUMN source_rating INTEGER,
ADD COLUMN source_confidence TEXT,
ADD COLUMN source_reasoning TEXT,
ADD COLUMN source_warning TEXT;

-- Update discussion_likes to support agree/disagree types
ALTER TABLE public.discussion_likes
DROP CONSTRAINT IF EXISTS like_target_check;

ALTER TABLE public.discussion_likes
ADD COLUMN response_type TEXT NOT NULL DEFAULT 'like',
ADD CONSTRAINT valid_response_type CHECK (response_type IN ('like', 'agree', 'disagree'));

-- Add unique constraint for user responses to comments
ALTER TABLE public.discussion_likes
DROP CONSTRAINT IF EXISTS unique_comment_like;

ALTER TABLE public.discussion_likes
ADD CONSTRAINT unique_comment_response UNIQUE(user_id, comment_id, response_type);

ALTER TABLE public.discussion_likes
ADD CONSTRAINT like_target_check CHECK (
  (post_id IS NOT NULL AND comment_id IS NULL) OR 
  (post_id IS NULL AND comment_id IS NOT NULL)
);

-- Create function to update comment scores
CREATE OR REPLACE FUNCTION public.update_comment_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.comment_id IS NOT NULL THEN
    IF NEW.response_type = 'agree' THEN
      UPDATE discussion_comments 
      SET score = score + 1 
      WHERE id = NEW.comment_id;
    ELSIF NEW.response_type = 'disagree' THEN
      UPDATE discussion_comments 
      SET score = score - 1 
      WHERE id = NEW.comment_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create function to revert comment scores on response deletion
CREATE OR REPLACE FUNCTION public.revert_comment_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.comment_id IS NOT NULL THEN
    IF OLD.response_type = 'agree' THEN
      UPDATE discussion_comments 
      SET score = GREATEST(score - 1, 0)
      WHERE id = OLD.comment_id;
    ELSIF OLD.response_type = 'disagree' THEN
      UPDATE discussion_comments 
      SET score = score + 1 
      WHERE id = OLD.comment_id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

-- Triggers for comment scoring
CREATE TRIGGER update_comment_score_on_response
  AFTER INSERT ON public.discussion_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_score();

CREATE TRIGGER revert_comment_score_on_response_delete
  AFTER DELETE ON public.discussion_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.revert_comment_score();

-- Create table to track user points from discussions
CREATE TABLE public.discussion_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES discussion_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES discussion_comments(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL DEFAULT 0,
  action_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_action_type CHECK (action_type IN ('post_created', 'comment_posted', 'comment_agreed', 'comment_sourced', 'high_quality_source'))
);

-- Enable RLS on discussion_points
ALTER TABLE public.discussion_points ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discussion_points
CREATE POLICY "Users can view their own points"
  ON public.discussion_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert points"
  ON public.discussion_points FOR INSERT
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_discussion_points_user_id ON public.discussion_points(user_id);
CREATE INDEX idx_discussion_comments_score ON public.discussion_comments(score DESC);