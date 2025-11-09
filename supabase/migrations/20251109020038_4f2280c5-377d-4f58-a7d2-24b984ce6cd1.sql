-- Update the delete policy on analyses table to allow admins to delete any case
DROP POLICY IF EXISTS "Users can delete their own analyses" ON public.analyses;

CREATE POLICY "Users can delete their own analyses or admins can delete any" 
ON public.analyses 
FOR DELETE 
USING (
  auth.uid() = user_id OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);