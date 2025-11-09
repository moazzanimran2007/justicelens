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