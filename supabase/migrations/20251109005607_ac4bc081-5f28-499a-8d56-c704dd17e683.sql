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