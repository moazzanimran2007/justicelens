-- Add team-related fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS team_name text,
ADD COLUMN IF NOT EXISTS bio text;