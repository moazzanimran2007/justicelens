-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own cases or assigned cases" ON public.analyses;

-- Create a new policy that allows all authenticated users to view all cases
CREATE POLICY "All authenticated users can view cases"
ON public.analyses
FOR SELECT
TO authenticated
USING (true);

-- Keep other policies unchanged (INSERT, UPDATE, DELETE remain restricted)