-- Add foreign key constraint from case_comments to profiles
ALTER TABLE public.case_comments
ADD CONSTRAINT case_comments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;