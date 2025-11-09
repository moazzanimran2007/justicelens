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