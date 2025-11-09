
-- Migration: 20251109175039

-- Migration: 20251109004617

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


-- Migration: 20251109005606
-- Create app role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'investigator', 'attorney', 'advocate');

-- Create user_roles table for proper role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create pipeline_stages table
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view stages"
ON public.pipeline_stages FOR SELECT
TO authenticated
USING (true);

-- Insert default pipeline stages
INSERT INTO public.pipeline_stages (name, display_order, color) VALUES
  ('Intake', 1, '#3B82F6'),
  ('Initial Review', 2, '#8B5CF6'),
  ('Investigation', 3, '#F59E0B'),
  ('Legal Analysis', 4, '#EC4899'),
  ('Advocacy Ready', 5, '#10B981'),
  ('Filed', 6, '#06B6D4'),
  ('Closed', 7, '#6B7280');

-- Add pipeline columns to analyses table
ALTER TABLE public.analyses 
  ADD COLUMN stage_id UUID REFERENCES public.pipeline_stages(id),
  ADD COLUMN assigned_to UUID REFERENCES auth.users(id),
  ADD COLUMN priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  ADD COLUMN case_number TEXT,
  ADD COLUMN client_name TEXT;

-- Set default stage to Intake for existing records
UPDATE public.analyses 
SET stage_id = (SELECT id FROM public.pipeline_stages WHERE name = 'Intake' LIMIT 1)
WHERE stage_id IS NULL;

-- Create case_activities table for activity tracking
CREATE TABLE public.case_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.case_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities for accessible cases"
ON public.case_activities FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create activities"
ON public.case_activities FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for activities
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_activities;

-- Create case_comments table
CREATE TABLE public.case_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.case_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments for accessible cases"
ON public.case_comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create comments"
ON public.case_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.case_comments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.case_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger for comment updated_at
CREATE TRIGGER update_case_comments_updated_at
BEFORE UPDATE ON public.case_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_comments;

-- Update RLS policies on analyses for team collaboration
DROP POLICY IF EXISTS "Users can view their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can update their own analyses" ON public.analyses;

CREATE POLICY "Authenticated users can view all cases"
ON public.analyses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update cases they created or are assigned to"
ON public.analyses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = assigned_to);

-- Function to log stage changes
CREATE OR REPLACE FUNCTION public.log_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_stage_name TEXT;
  new_stage_name TEXT;
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    SELECT name INTO old_stage_name FROM public.pipeline_stages WHERE id = OLD.stage_id;
    SELECT name INTO new_stage_name FROM public.pipeline_stages WHERE id = NEW.stage_id;
    
    INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'stage_changed',
      'Stage changed from ' || COALESCE(old_stage_name, 'None') || ' to ' || new_stage_name,
      jsonb_build_object('old_stage', old_stage_name, 'new_stage', new_stage_name)
    );
  END IF;
  
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'assignment_changed',
      CASE 
        WHEN NEW.assigned_to IS NULL THEN 'Case unassigned'
        ELSE 'Case assigned'
      END,
      jsonb_build_object('assigned_to', NEW.assigned_to)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to log changes
CREATE TRIGGER log_case_changes
AFTER UPDATE ON public.analyses
FOR EACH ROW
EXECUTE FUNCTION public.log_stage_change();

-- Migration: 20251109010422
-- Create profiles table for user information
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are viewable by all authenticated users (for collaboration)
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert profiles for existing users
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Migration: 20251109010700
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.analyses(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'case_assigned', 'comment_added', 'stage_changed', etc.
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- System can insert notifications for any user
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification for case assignment
CREATE OR REPLACE FUNCTION notify_case_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigner_name text;
BEGIN
  -- Only notify if assigned_to changed and is not null
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    -- Get the name of person who assigned the case
    SELECT COALESCE(full_name, email) INTO assigner_name
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Create notification for the assignee
    INSERT INTO public.notifications (user_id, case_id, type, title, message, metadata)
    VALUES (
      NEW.assigned_to,
      NEW.id,
      'case_assigned',
      'New case assigned',
      COALESCE(assigner_name, 'Someone') || ' assigned case "' || COALESCE(NEW.client_name, NEW.file_name) || '" to you',
      jsonb_build_object('assigned_by', auth.uid(), 'case_name', COALESCE(NEW.client_name, NEW.file_name))
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for case assignment notifications
CREATE TRIGGER notify_on_case_assignment
  AFTER UPDATE ON public.analyses
  FOR EACH ROW
  EXECUTE FUNCTION notify_case_assignment();

-- Function to notify assigned user when comment is added
CREATE OR REPLACE FUNCTION notify_comment_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_user_id uuid;
  commenter_name text;
  case_name text;
BEGIN
  -- Get the assigned user for this case
  SELECT assigned_to INTO assigned_user_id
  FROM public.analyses
  WHERE id = NEW.case_id;
  
  -- Get commenter name
  SELECT COALESCE(full_name, email) INTO commenter_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Get case name
  SELECT COALESCE(client_name, file_name) INTO case_name
  FROM public.analyses
  WHERE id = NEW.case_id;
  
  -- Only notify if there's an assigned user and they're not the commenter
  IF assigned_user_id IS NOT NULL AND assigned_user_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, case_id, type, title, message, metadata)
    VALUES (
      assigned_user_id,
      NEW.case_id,
      'comment_added',
      'New comment on your case',
      COALESCE(commenter_name, 'Someone') || ' commented on case "' || case_name || '"',
      jsonb_build_object('commenter_id', NEW.user_id, 'comment_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for comment notifications
CREATE TRIGGER notify_on_comment_added
  AFTER INSERT ON public.case_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_added();

-- Migration: 20251109014645
-- Enable full row tracking for realtime updates
ALTER TABLE public.case_activities REPLICA IDENTITY FULL;

-- Migration: 20251109015116
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

-- Migration: 20251109020036
-- Update the delete policy on analyses table to allow admins to delete any case
DROP POLICY IF EXISTS "Users can delete their own analyses" ON public.analyses;

CREATE POLICY "Users can delete their own analyses or admins can delete any" 
ON public.analyses 
FOR DELETE 
USING (
  auth.uid() = user_id OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Migration: 20251109020318
-- Add foreign key constraint from case_comments to profiles
ALTER TABLE public.case_comments
ADD CONSTRAINT case_comments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Migration: 20251109020456
-- Add mentioned_users column to case_comments table to track @mentions
ALTER TABLE public.case_comments
ADD COLUMN mentioned_users uuid[] DEFAULT '{}';

-- Create function to notify mentioned users
CREATE OR REPLACE FUNCTION public.notify_mentioned_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mentioned_user_id uuid;
  commenter_name text;
  case_name text;
BEGIN
  -- Get commenter name
  SELECT COALESCE(full_name, email) INTO commenter_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Get case name
  SELECT COALESCE(client_name, file_name) INTO case_name
  FROM public.analyses
  WHERE id = NEW.case_id;
  
  -- Loop through mentioned users and create notifications
  IF NEW.mentioned_users IS NOT NULL THEN
    FOREACH mentioned_user_id IN ARRAY NEW.mentioned_users
    LOOP
      -- Don't notify if user mentioned themselves
      IF mentioned_user_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, case_id, type, title, message, metadata)
        VALUES (
          mentioned_user_id,
          NEW.case_id,
          'user_mentioned',
          'You were mentioned in a comment',
          COALESCE(commenter_name, 'Someone') || ' mentioned you in a comment on case "' || case_name || '"',
          jsonb_build_object('commenter_id', NEW.user_id, 'comment_id', NEW.id)
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for mentioned users
DROP TRIGGER IF EXISTS notify_mentioned_users_trigger ON public.case_comments;
CREATE TRIGGER notify_mentioned_users_trigger
  AFTER INSERT ON public.case_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mentioned_users();

-- Migration: 20251109022243
-- Allow admins to update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Migration: 20251109024212
-- Add nickname column to profiles table
ALTER TABLE public.profiles ADD COLUMN nickname text;

-- Migration: 20251109041622
-- Add team-related fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS team_name text,
ADD COLUMN IF NOT EXISTS bio text;

-- Migration: 20251109043734
-- Update the log_stage_change function to also track priority changes and case creation
CREATE OR REPLACE FUNCTION public.log_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  old_stage_name TEXT;
  new_stage_name TEXT;
  old_priority TEXT;
  new_priority TEXT;
BEGIN
  -- Log case creation (INSERT)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
    VALUES (
      NEW.id,
      COALESCE(auth.uid(), NEW.user_id),
      'case_created',
      'Case created',
      jsonb_build_object('client_name', NEW.client_name, 'file_name', NEW.file_name)
    );
  END IF;
  
  -- Log stage changes (UPDATE)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
      SELECT name INTO old_stage_name FROM public.pipeline_stages WHERE id = OLD.stage_id;
      SELECT name INTO new_stage_name FROM public.pipeline_stages WHERE id = NEW.stage_id;
      
      INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        auth.uid(),
        'stage_changed',
        'Stage changed from ' || COALESCE(old_stage_name, 'None') || ' to ' || new_stage_name,
        jsonb_build_object('old_stage', old_stage_name, 'new_stage', new_stage_name)
      );
    END IF;
    
    -- Log assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        auth.uid(),
        'assignment_changed',
        CASE 
          WHEN NEW.assigned_to IS NULL THEN 'Case unassigned'
          ELSE 'Case assigned'
        END,
        jsonb_build_object('assigned_to', NEW.assigned_to)
      );
    END IF;
    
    -- Log priority changes
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      old_priority := COALESCE(OLD.priority, 'none');
      new_priority := COALESCE(NEW.priority, 'none');
      
      INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        auth.uid(),
        'priority_changed',
        'Priority changed from ' || old_priority || ' to ' || new_priority,
        jsonb_build_object('old_priority', old_priority, 'new_priority', new_priority)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the trigger to handle both INSERT and UPDATE
DROP TRIGGER IF EXISTS log_case_changes ON public.analyses;
CREATE TRIGGER log_case_changes
AFTER INSERT OR UPDATE ON public.analyses
FOR EACH ROW
EXECUTE FUNCTION public.log_stage_change();

-- Migration: 20251109043749
-- Fix the log_stage_change function to have proper search_path
CREATE OR REPLACE FUNCTION public.log_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  old_stage_name TEXT;
  new_stage_name TEXT;
  old_priority TEXT;
  new_priority TEXT;
BEGIN
  -- Log case creation (INSERT)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
    VALUES (
      NEW.id,
      COALESCE(auth.uid(), NEW.user_id),
      'case_created',
      'Case created',
      jsonb_build_object('client_name', NEW.client_name, 'file_name', NEW.file_name)
    );
  END IF;
  
  -- Log stage changes (UPDATE)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
      SELECT name INTO old_stage_name FROM public.pipeline_stages WHERE id = OLD.stage_id;
      SELECT name INTO new_stage_name FROM public.pipeline_stages WHERE id = NEW.stage_id;
      
      INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        auth.uid(),
        'stage_changed',
        'Stage changed from ' || COALESCE(old_stage_name, 'None') || ' to ' || new_stage_name,
        jsonb_build_object('old_stage', old_stage_name, 'new_stage', new_stage_name)
      );
    END IF;
    
    -- Log assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        auth.uid(),
        'assignment_changed',
        CASE 
          WHEN NEW.assigned_to IS NULL THEN 'Case unassigned'
          ELSE 'Case assigned'
        END,
        jsonb_build_object('assigned_to', NEW.assigned_to)
      );
    END IF;
    
    -- Log priority changes
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      old_priority := COALESCE(OLD.priority, 'none');
      new_priority := COALESCE(NEW.priority, 'none');
      
      INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        auth.uid(),
        'priority_changed',
        'Priority changed from ' || old_priority || ' to ' || new_priority,
        jsonb_build_object('old_priority', old_priority, 'new_priority', new_priority)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Migration: 20251109044911
-- Create team_settings table for organization-wide settings
CREATE TABLE public.team_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name text NOT NULL DEFAULT 'Justice Team',
  team_icon text DEFAULT '⚖️',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view team settings
CREATE POLICY "Anyone authenticated can view team settings"
ON public.team_settings
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admins can update team settings
CREATE POLICY "Only admins can update team settings"
ON public.team_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Only admins can insert team settings
CREATE POLICY "Only admins can insert team settings"
ON public.team_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default team settings (only one row should exist)
INSERT INTO public.team_settings (team_name, team_icon) 
VALUES ('Justice Team', '⚖️');

-- Add trigger for updated_at
CREATE TRIGGER update_team_settings_updated_at
BEFORE UPDATE ON public.team_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251109045112
-- Create storage bucket for team logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-logos', 'team-logos', true);

-- Create policy to allow anyone to view team logos
CREATE POLICY "Team logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'team-logos');

-- Create policy to allow only admins to upload team logos
CREATE POLICY "Only admins can upload team logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-logos' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Create policy to allow only admins to update team logos
CREATE POLICY "Only admins can update team logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'team-logos' 
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'team-logos' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Create policy to allow only admins to delete team logos
CREATE POLICY "Only admins can delete team logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-logos' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Add logo_url column to team_settings
ALTER TABLE public.team_settings
ADD COLUMN logo_url text;

-- Migration: 20251109045259
-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Create policy to allow anyone to view avatars
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Create policy to allow users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Migration: 20251109045458
-- Ensure consistent user data by syncing profiles with auth.users
-- This handles any edge cases where profiles might be missing or out of sync

-- First, ensure the handle_new_user function updates email if it changes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) 
  DO UPDATE SET 
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Also add a trigger to sync email updates from auth.users to profiles
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update if email actually changed
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.profiles
    SET email = NEW.email,
        updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.sync_user_email();

-- Migration: 20251109050210
-- Update the RLS policy for analyses table to allow all authenticated users to update stages
-- This is important for collaborative workflow management where team members need to move cases through the pipeline

-- Drop the old restrictive update policy
DROP POLICY IF EXISTS "Users can update cases they created or are assigned to" ON public.analyses;

-- Create a new more permissive update policy that allows:
-- 1. Admins can update any case
-- 2. Users can update cases they created
-- 3. Users can update cases assigned to them
-- 4. Any authenticated user can update the stage_id (for pipeline workflow)
CREATE POLICY "Users can update cases with stage workflow support"
ON public.analyses
FOR UPDATE
TO authenticated
USING (
  -- User can update if they're admin, creator, or assignee
  has_role(auth.uid(), 'admin'::app_role) 
  OR auth.uid() = user_id 
  OR auth.uid() = assigned_to
);


-- Migration: 20251109181140
-- Fix overly permissive RLS policy on analyses table
-- Drop the policy that allows all authenticated users to view all cases
DROP POLICY IF EXISTS "Authenticated users can view all cases" ON public.analyses;

-- Create restrictive policy that only allows users to see their own cases or assigned cases
CREATE POLICY "Users can view their own cases or assigned cases"
ON public.analyses FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR auth.uid() = assigned_to 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Migration: 20251109190206
-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own cases or assigned cases" ON public.analyses;

-- Create a new policy that allows all authenticated users to view all cases
CREATE POLICY "All authenticated users can view cases"
ON public.analyses
FOR SELECT
TO authenticated
USING (true);

-- Keep other policies unchanged (INSERT, UPDATE, DELETE remain restricted);

-- Migration: 20251109195925
-- Allow admins to manage pipeline stages
CREATE POLICY "Admins can insert pipeline stages"
ON public.pipeline_stages
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pipeline stages"
ON public.pipeline_stages
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pipeline stages"
ON public.pipeline_stages
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Migration: 20251109221659
-- Fix log_stage_change function to handle system-initiated changes
CREATE OR REPLACE FUNCTION public.log_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  old_stage_name TEXT;
  new_stage_name TEXT;
  old_priority TEXT;
  new_priority TEXT;
  activity_user_id UUID;
BEGIN
  -- Determine user_id: use auth.uid() if available, otherwise use case owner
  activity_user_id := COALESCE(auth.uid(), NEW.user_id);
  
  -- Log case creation (INSERT)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
    VALUES (
      NEW.id,
      activity_user_id,
      'case_created',
      'Case created',
      jsonb_build_object('client_name', NEW.client_name, 'file_name', NEW.file_name)
    );
  END IF;
  
  -- Log stage changes (UPDATE)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
      SELECT name INTO old_stage_name FROM public.pipeline_stages WHERE id = OLD.stage_id;
      SELECT name INTO new_stage_name FROM public.pipeline_stages WHERE id = NEW.stage_id;
      
      INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        activity_user_id,
        'stage_changed',
        'Stage changed from ' || COALESCE(old_stage_name, 'None') || ' to ' || new_stage_name,
        jsonb_build_object('old_stage', old_stage_name, 'new_stage', new_stage_name)
      );
    END IF;
    
    -- Log assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        activity_user_id,
        'assignment_changed',
        CASE 
          WHEN NEW.assigned_to IS NULL THEN 'Case unassigned'
          ELSE 'Case assigned'
        END,
        jsonb_build_object('assigned_to', NEW.assigned_to)
      );
    END IF;
    
    -- Log priority changes (including automatic ones from AI analysis)
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      old_priority := COALESCE(OLD.priority, 'none');
      new_priority := COALESCE(NEW.priority, 'none');
      
      INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        activity_user_id,
        'priority_changed',
        CASE 
          WHEN auth.uid() IS NULL THEN 'Priority auto-set to ' || new_priority || ' based on analysis'
          ELSE 'Priority changed from ' || old_priority || ' to ' || new_priority
        END,
        jsonb_build_object('old_priority', old_priority, 'new_priority', new_priority, 'auto_set', auth.uid() IS NULL)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Migration: 20251109221728
-- Fix log_stage_change function to handle system-initiated changes
CREATE OR REPLACE FUNCTION public.log_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  old_stage_name TEXT;
  new_stage_name TEXT;
  old_priority TEXT;
  new_priority TEXT;
  activity_user_id UUID;
BEGIN
  -- Determine user_id: use auth.uid() if available, otherwise use case owner
  activity_user_id := COALESCE(auth.uid(), NEW.user_id);
  
  -- Log case creation (INSERT)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
    VALUES (
      NEW.id,
      activity_user_id,
      'case_created',
      'Case created',
      jsonb_build_object('client_name', NEW.client_name, 'file_name', NEW.file_name)
    );
  END IF;
  
  -- Log stage changes (UPDATE)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
      SELECT name INTO old_stage_name FROM public.pipeline_stages WHERE id = OLD.stage_id;
      SELECT name INTO new_stage_name FROM public.pipeline_stages WHERE id = NEW.stage_id;
      
      INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        activity_user_id,
        'stage_changed',
        'Stage changed from ' || COALESCE(old_stage_name, 'None') || ' to ' || new_stage_name,
        jsonb_build_object('old_stage', old_stage_name, 'new_stage', new_stage_name)
      );
    END IF;
    
    -- Log assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        activity_user_id,
        'assignment_changed',
        CASE 
          WHEN NEW.assigned_to IS NULL THEN 'Case unassigned'
          ELSE 'Case assigned'
        END,
        jsonb_build_object('assigned_to', NEW.assigned_to)
      );
    END IF;
    
    -- Log priority changes (including automatic ones from AI analysis)
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      old_priority := COALESCE(OLD.priority, 'none');
      new_priority := COALESCE(NEW.priority, 'none');
      
      INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        activity_user_id,
        'priority_changed',
        CASE 
          WHEN auth.uid() IS NULL THEN 'Priority auto-set to ' || new_priority || ' based on analysis'
          ELSE 'Priority changed from ' || old_priority || ' to ' || new_priority
        END,
        jsonb_build_object('old_priority', old_priority, 'new_priority', new_priority, 'auto_set', auth.uid() IS NULL)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
