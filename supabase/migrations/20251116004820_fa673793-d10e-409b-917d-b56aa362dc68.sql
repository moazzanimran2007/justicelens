-- Create team_invitations table
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  max_uses INTEGER DEFAULT 1,
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for team_invitations
CREATE POLICY "Anyone can view active invitations to accept them"
  ON public.team_invitations FOR SELECT
  USING (status = 'active' AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Team admins can create invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_invitations.team_id
      AND user_id = auth.uid()
      AND role = 'admin'
      AND status = 'approved'
    )
  );

CREATE POLICY "Team admins can update their team invitations"
  ON public.team_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_invitations.team_id
      AND user_id = auth.uid()
      AND role = 'admin'
      AND status = 'approved'
    )
  );

CREATE POLICY "Team admins can delete their team invitations"
  ON public.team_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_invitations.team_id
      AND user_id = auth.uid()
      AND role = 'admin'
      AND status = 'approved'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster invite code lookups
CREATE INDEX idx_team_invitations_code ON public.team_invitations(invite_code) WHERE status = 'active';