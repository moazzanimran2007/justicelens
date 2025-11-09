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