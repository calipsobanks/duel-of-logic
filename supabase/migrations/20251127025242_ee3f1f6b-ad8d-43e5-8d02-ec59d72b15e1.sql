-- Enable realtime for evidence table
ALTER TABLE public.evidence REPLICA IDENTITY FULL;

-- Add to realtime publication (create if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.evidence;