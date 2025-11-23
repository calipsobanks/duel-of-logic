-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are viewable by everyone
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Create debates table
CREATE TABLE public.debates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  debater1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  debater2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  debater1_score INT DEFAULT 0 NOT NULL,
  debater2_score INT DEFAULT 0 NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT different_debaters CHECK (debater1_id != debater2_id)
);

-- Enable RLS
ALTER TABLE public.debates ENABLE ROW LEVEL SECURITY;

-- Only participants can view their debates
CREATE POLICY "Participants can view their debates" 
ON public.debates 
FOR SELECT 
USING (auth.uid() = debater1_id OR auth.uid() = debater2_id);

-- Users can create debates where they are debater1
CREATE POLICY "Users can create debates as debater1" 
ON public.debates 
FOR INSERT 
WITH CHECK (auth.uid() = debater1_id);

-- Participants can update their debates
CREATE POLICY "Participants can update their debates" 
ON public.debates 
FOR UPDATE 
USING (auth.uid() = debater1_id OR auth.uid() = debater2_id);

-- Create evidence table
CREATE TABLE public.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID REFERENCES public.debates(id) ON DELETE CASCADE NOT NULL,
  debater_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  claim TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

-- Only debate participants can view evidence
CREATE POLICY "Debate participants can view evidence" 
ON public.evidence 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.debates 
    WHERE id = evidence.debate_id 
    AND (debater1_id = auth.uid() OR debater2_id = auth.uid())
  )
);

-- Participants can insert evidence for their debates
CREATE POLICY "Participants can insert evidence" 
ON public.evidence 
FOR INSERT 
WITH CHECK (
  auth.uid() = debater_id 
  AND EXISTS (
    SELECT 1 FROM public.debates 
    WHERE id = debate_id 
    AND (debater1_id = auth.uid() OR debater2_id = auth.uid())
  )
);

-- Participants can update evidence in their debates
CREATE POLICY "Participants can update evidence" 
ON public.evidence 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.debates 
    WHERE id = evidence.debate_id 
    AND (debater1_id = auth.uid() OR debater2_id = auth.uid())
  )
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_debates_updated_at
BEFORE UPDATE ON public.debates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();