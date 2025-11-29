-- Create group discussions table
CREATE TABLE public.group_discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.controversial_topics(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group discussion participants table
CREATE TABLE public.group_discussion_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.group_discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  stance TEXT CHECK (stance IN ('agree', 'disagree')),
  has_submitted_evidence BOOLEAN NOT NULL DEFAULT false,
  score INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(discussion_id, user_id)
);

-- Create group evidence table
CREATE TABLE public.group_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.group_discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  claim TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT,
  source_rating INTEGER,
  source_reasoning TEXT,
  source_confidence TEXT,
  source_warning TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group evidence responses table
CREATE TABLE public.group_evidence_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evidence_id UUID NOT NULL REFERENCES public.group_evidence(id) ON DELETE CASCADE,
  respondent_id UUID NOT NULL REFERENCES public.profiles(id),
  response_type TEXT NOT NULL CHECK (response_type IN ('agree', 'disagree')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(evidence_id, respondent_id)
);

-- Enable RLS
ALTER TABLE public.group_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_discussion_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_evidence_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_discussions
CREATE POLICY "Anyone can view active group discussions"
  ON public.group_discussions FOR SELECT
  USING (status = 'active');

CREATE POLICY "Authenticated users can create group discussions"
  ON public.group_discussions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS Policies for group_discussion_participants
CREATE POLICY "Participants can view all participants in their discussions"
  ON public.group_discussion_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_discussion_participants p
    WHERE p.discussion_id = group_discussion_participants.discussion_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can join discussions"
  ON public.group_discussion_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Participants can update their own record"
  ON public.group_discussion_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for group_evidence
CREATE POLICY "Participants can view evidence in their discussions"
  ON public.group_evidence FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_discussion_participants p
    WHERE p.discussion_id = group_evidence.discussion_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Participants can insert evidence"
  ON public.group_evidence FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.group_discussion_participants p
      WHERE p.discussion_id = group_evidence.discussion_id
      AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for group_evidence_responses
CREATE POLICY "Participants can view responses in their discussions"
  ON public.group_evidence_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_evidence e
    JOIN public.group_discussion_participants p ON e.discussion_id = p.discussion_id
    WHERE e.id = group_evidence_responses.evidence_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Participants can add responses"
  ON public.group_evidence_responses FOR INSERT
  WITH CHECK (
    auth.uid() = respondent_id
    AND EXISTS (
      SELECT 1 FROM public.group_evidence e
      JOIN public.group_discussion_participants p ON e.discussion_id = p.discussion_id
      WHERE e.id = group_evidence_responses.evidence_id
      AND p.user_id = auth.uid()
    )
  );

-- Trigger to update group_discussions.updated_at
CREATE TRIGGER update_group_discussions_updated_at
  BEFORE UPDATE ON public.group_discussions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();