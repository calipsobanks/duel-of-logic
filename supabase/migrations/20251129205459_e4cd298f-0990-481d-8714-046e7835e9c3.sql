-- Create discussion_posts table for user-posted topics
CREATE TABLE public.discussion_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false
);

-- Create discussion_comments table
CREATE TABLE public.discussion_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES discussion_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES discussion_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  likes_count INTEGER NOT NULL DEFAULT 0
);

-- Create discussion_likes table
CREATE TABLE public.discussion_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES discussion_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES discussion_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_post_like UNIQUE(user_id, post_id),
  CONSTRAINT unique_comment_like UNIQUE(user_id, comment_id),
  CONSTRAINT like_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR 
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Create debate_challenges table
CREATE TABLE public.debate_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenged_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES discussion_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES discussion_comments(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  debate_id UUID REFERENCES debates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_challenge_status CHECK (status IN ('pending', 'accepted', 'declined'))
);

-- Enable RLS
ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discussion_posts
CREATE POLICY "Anyone can view posts"
  ON public.discussion_posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON public.discussion_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.discussion_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.discussion_posts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for discussion_comments
CREATE POLICY "Anyone can view comments"
  ON public.discussion_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.discussion_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.discussion_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.discussion_comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for discussion_likes
CREATE POLICY "Anyone can view likes"
  ON public.discussion_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create likes"
  ON public.discussion_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.discussion_likes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for debate_challenges
CREATE POLICY "Users can view their challenges"
  ON public.debate_challenges FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

CREATE POLICY "Authenticated users can create challenges"
  ON public.debate_challenges FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Challenged users can update challenge status"
  ON public.debate_challenges FOR UPDATE
  USING (auth.uid() = challenged_id);

-- Trigger to update updated_at on discussion_posts
CREATE TRIGGER update_discussion_posts_updated_at
  BEFORE UPDATE ON public.discussion_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment likes count
CREATE OR REPLACE FUNCTION public.increment_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    UPDATE discussion_posts 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.post_id;
  ELSIF NEW.comment_id IS NOT NULL THEN
    UPDATE discussion_comments 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.comment_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Function to decrement likes count
CREATE OR REPLACE FUNCTION public.decrement_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.post_id IS NOT NULL THEN
    UPDATE discussion_posts 
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.post_id;
  ELSIF OLD.comment_id IS NOT NULL THEN
    UPDATE discussion_comments 
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.comment_id;
  END IF;
  RETURN OLD;
END;
$$;

-- Triggers for likes count
CREATE TRIGGER increment_likes_on_insert
  AFTER INSERT ON public.discussion_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_likes_count();

CREATE TRIGGER decrement_likes_on_delete
  AFTER DELETE ON public.discussion_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_likes_count();

-- Function to increment comments count
CREATE OR REPLACE FUNCTION public.increment_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE discussion_posts 
  SET comments_count = comments_count + 1 
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

-- Function to decrement comments count
CREATE OR REPLACE FUNCTION public.decrement_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE discussion_posts 
  SET comments_count = GREATEST(comments_count - 1, 0)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

-- Triggers for comments count
CREATE TRIGGER increment_comments_on_insert
  AFTER INSERT ON public.discussion_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_comments_count();

CREATE TRIGGER decrement_comments_on_delete
  AFTER DELETE ON public.discussion_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_comments_count();