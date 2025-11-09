-- Add column to store people mentioned in transcripts
ALTER TABLE public.legal_memos 
ADD COLUMN people_mentioned jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.legal_memos.people_mentioned IS 'Array of people mentioned in the transcript with their roles/context';