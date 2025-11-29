-- Add foreign key relationship to profiles table
ALTER TABLE public.feedback
ADD CONSTRAINT feedback_user_id_fkey
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;