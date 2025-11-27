-- Add deleted_at column for soft deletes (preserves scores)
ALTER TABLE public.debates 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Add deleted_by column to track who deleted
ALTER TABLE public.debates 
ADD COLUMN deleted_by uuid DEFAULT NULL;