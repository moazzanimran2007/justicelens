
-- Migration: 20251108225102
-- Create storage bucket for transcript files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('transcripts', 'transcripts', false)
ON CONFLICT (id) DO NOTHING;

-- Create analyses table to store analysis results
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  analysis_modules TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  results JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analyses
CREATE POLICY "Users can view their own analyses"
  ON public.analyses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses"
  ON public.analyses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
  ON public.analyses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
  ON public.analyses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Storage policies for transcripts bucket
CREATE POLICY "Users can upload their own transcripts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'transcripts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own transcripts"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'transcripts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own transcripts"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'transcripts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analyses_updated_at
  BEFORE UPDATE ON public.analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251108225208
-- Drop trigger first
DROP TRIGGER IF EXISTS update_analyses_updated_at ON public.analyses;

-- Drop and recreate function with proper search path
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_analyses_updated_at
  BEFORE UPDATE ON public.analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251108235555
-- Create a table to store extracted legal memo information from parole transcripts
CREATE TABLE public.legal_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  
  -- Client Information
  client_name text,
  cdcr_number text,
  contact_information text,
  date_of_birth text,
  
  -- Introduction
  short_summary text,
  evidence_used_to_convict text[], -- Array of evidence items
  potential_theory_of_case text,
  
  -- Conviction & Sentence Summary
  date_of_crime text,
  location_of_crime text,
  date_of_arrest text,
  date_of_conviction text,
  convicted_of text,
  county_of_conviction text,
  sentence text,
  parole_eligibility_date text,
  prior_parole_hearing_result text,
  client_priors text,
  
  -- Superior Court Case Information
  trial_court_case_no text,
  trial_court_judge_dept text,
  trial_attorney text,
  prosecuting_attorney text,
  co_defendant text,
  co_defendant_attorney text,
  
  -- Appellate Court Information
  appellate_case_no text,
  appellate_attorneys text,
  
  -- Post-Conviction Issues
  direct_appeal_date text,
  direct_appeal_issues text[],
  petition_for_review_date text,
  petition_for_review_issues text[],
  habeas_petition_date text,
  habeas_petition_issues text[],
  
  -- Prosecution & Defense
  prosecution_presented text,
  defense_presented text,
  
  -- Wrongful Conviction Issues (stored as array of checked items)
  wrongful_conviction_issues text[],
  
  -- Innocence Claims
  innocence_claims jsonb,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_memos ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own legal memos"
ON public.legal_memos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.analyses
    WHERE analyses.id = legal_memos.analysis_id
    AND analyses.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert legal memos for their analyses"
ON public.legal_memos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.analyses
    WHERE analyses.id = legal_memos.analysis_id
    AND analyses.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own legal memos"
ON public.legal_memos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.analyses
    WHERE analyses.id = legal_memos.analysis_id
    AND analyses.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own legal memos"
ON public.legal_memos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.analyses
    WHERE analyses.id = legal_memos.analysis_id
    AND analyses.user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_legal_memos_updated_at
BEFORE UPDATE ON public.legal_memos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251109003750
-- Add column to store people mentioned in transcripts
ALTER TABLE public.legal_memos 
ADD COLUMN people_mentioned jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.legal_memos.people_mentioned IS 'Array of people mentioned in the transcript with their roles/context';

-- Migration: 20251109004021
-- Add column to store additional information found about people
ALTER TABLE public.legal_memos 
ADD COLUMN people_additional_info jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.legal_memos.people_additional_info IS 'Additional public information found about people mentioned (search results, CDCR links, etc.)';
