-- Add column to store additional information found about people
ALTER TABLE public.legal_memos 
ADD COLUMN people_additional_info jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.legal_memos.people_additional_info IS 'Additional public information found about people mentioned (search results, CDCR links, etc.)';