-- Remove the old beliefs array column and add structured belief fields
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS beliefs;

-- Add structured belief columns
ALTER TABLE public.profiles 
ADD COLUMN religion text,
ADD COLUMN political_view text,
ADD COLUMN university_degree text;

-- Add comments to document the columns
COMMENT ON COLUMN public.profiles.religion IS 'User''s religious belief or preference';
COMMENT ON COLUMN public.profiles.political_view IS 'User''s political affiliation or view';
COMMENT ON COLUMN public.profiles.university_degree IS 'Whether user has completed a 4-year university degree';