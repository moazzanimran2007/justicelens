-- Enable full row tracking for realtime updates on case_comments
ALTER TABLE public.case_comments REPLICA IDENTITY FULL;

-- Ensure case_comments is in the realtime publication (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'case_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.case_comments;
  END IF;
END $$;