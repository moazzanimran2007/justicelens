-- Add mentioned_users column to case_comments table to track @mentions
ALTER TABLE public.case_comments
ADD COLUMN mentioned_users uuid[] DEFAULT '{}';

-- Create function to notify mentioned users
CREATE OR REPLACE FUNCTION public.notify_mentioned_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mentioned_user_id uuid;
  commenter_name text;
  case_name text;
BEGIN
  -- Get commenter name
  SELECT COALESCE(full_name, email) INTO commenter_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Get case name
  SELECT COALESCE(client_name, file_name) INTO case_name
  FROM public.analyses
  WHERE id = NEW.case_id;
  
  -- Loop through mentioned users and create notifications
  IF NEW.mentioned_users IS NOT NULL THEN
    FOREACH mentioned_user_id IN ARRAY NEW.mentioned_users
    LOOP
      -- Don't notify if user mentioned themselves
      IF mentioned_user_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, case_id, type, title, message, metadata)
        VALUES (
          mentioned_user_id,
          NEW.case_id,
          'user_mentioned',
          'You were mentioned in a comment',
          COALESCE(commenter_name, 'Someone') || ' mentioned you in a comment on case "' || case_name || '"',
          jsonb_build_object('commenter_id', NEW.user_id, 'comment_id', NEW.id)
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for mentioned users
DROP TRIGGER IF EXISTS notify_mentioned_users_trigger ON public.case_comments;
CREATE TRIGGER notify_mentioned_users_trigger
  AFTER INSERT ON public.case_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mentioned_users();