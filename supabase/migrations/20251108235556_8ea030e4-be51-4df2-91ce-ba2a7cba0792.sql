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