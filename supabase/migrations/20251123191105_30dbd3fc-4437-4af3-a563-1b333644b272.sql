-- Add beliefs column to profiles table to store user's beliefs as hashtags
ALTER TABLE public.profiles 
ADD COLUMN beliefs text[] DEFAULT '{}';

-- Add a comment to document the column
COMMENT ON COLUMN public.profiles.beliefs IS 'Array of belief hashtags that users want to display on their profile';