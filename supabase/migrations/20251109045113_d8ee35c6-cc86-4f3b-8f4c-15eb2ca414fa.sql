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