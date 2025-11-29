-- Create feedback table
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can view all feedback (community transparency)
CREATE POLICY "Anyone can view all feedback"
ON public.feedback
FOR SELECT
USING (true);

-- Policy: Authenticated users can create their own feedback
CREATE POLICY "Users can create feedback"
ON public.feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own feedback (within 5 minutes of creation)
CREATE POLICY "Users can update their own recent feedback"
ON public.feedback
FOR UPDATE
USING (auth.uid() = user_id AND created_at > now() - interval '5 minutes');

-- Policy: Admins can update any feedback status
CREATE POLICY "Admins can update feedback status"
ON public.feedback
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_feedback_updated_at
BEFORE UPDATE ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();