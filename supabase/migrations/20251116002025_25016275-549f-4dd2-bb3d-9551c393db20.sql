-- Create teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create team_members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(team_id, user_id)
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for teams
CREATE POLICY "Anyone authenticated can view teams"
  ON public.teams FOR SELECT
  USING (true);

CREATE POLICY "Users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team admins can update their teams"
  ON public.teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'admin'
        AND team_members.status = 'approved'
    )
  );

CREATE POLICY "Team admins can delete their teams"
  ON public.teams FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'admin'
        AND team_members.status = 'approved'
    )
  );

-- RLS policies for team_members
CREATE POLICY "Anyone authenticated can view team members"
  ON public.team_members FOR SELECT
  USING (true);

CREATE POLICY "Users can request to join teams"
  ON public.team_members FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending' AND role = 'member');

CREATE POLICY "Team admins can manage members"
  ON public.team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
        AND tm.status = 'approved'
    )
  );

CREATE POLICY "Team admins can remove members"
  ON public.team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
        AND tm.status = 'approved'
    )
  );

CREATE POLICY "Users can leave teams"
  ON public.team_members FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to auto-approve team creator as admin
CREATE OR REPLACE FUNCTION public.auto_approve_team_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role, status)
  VALUES (NEW.id, NEW.created_by, 'admin', 'approved');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_approve_team_creator();

-- Update triggers
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();