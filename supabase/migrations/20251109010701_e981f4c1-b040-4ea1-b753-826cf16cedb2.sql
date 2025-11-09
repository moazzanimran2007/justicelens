-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.analyses(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'case_assigned', 'comment_added', 'stage_changed', etc.
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- System can insert notifications for any user
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification for case assignment
CREATE OR REPLACE FUNCTION notify_case_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigner_name text;
BEGIN
  -- Only notify if assigned_to changed and is not null
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    -- Get the name of person who assigned the case
    SELECT COALESCE(full_name, email) INTO assigner_name
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Create notification for the assignee
    INSERT INTO public.notifications (user_id, case_id, type, title, message, metadata)
    VALUES (
      NEW.assigned_to,
      NEW.id,
      'case_assigned',
      'New case assigned',
      COALESCE(assigner_name, 'Someone') || ' assigned case "' || COALESCE(NEW.client_name, NEW.file_name) || '" to you',
      jsonb_build_object('assigned_by', auth.uid(), 'case_name', COALESCE(NEW.client_name, NEW.file_name))
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for case assignment notifications
CREATE TRIGGER notify_on_case_assignment
  AFTER UPDATE ON public.analyses
  FOR EACH ROW
  EXECUTE FUNCTION notify_case_assignment();

-- Function to notify assigned user when comment is added
CREATE OR REPLACE FUNCTION notify_comment_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_user_id uuid;
  commenter_name text;
  case_name text;
BEGIN
  -- Get the assigned user for this case
  SELECT assigned_to INTO assigned_user_id
  FROM public.analyses
  WHERE id = NEW.case_id;
  
  -- Get commenter name
  SELECT COALESCE(full_name, email) INTO commenter_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Get case name
  SELECT COALESCE(client_name, file_name) INTO case_name
  FROM public.analyses
  WHERE id = NEW.case_id;
  
  -- Only notify if there's an assigned user and they're not the commenter
  IF assigned_user_id IS NOT NULL AND assigned_user_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, case_id, type, title, message, metadata)
    VALUES (
      assigned_user_id,
      NEW.case_id,
      'comment_added',
      'New comment on your case',
      COALESCE(commenter_name, 'Someone') || ' commented on case "' || case_name || '"',
      jsonb_build_object('commenter_id', NEW.user_id, 'comment_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for comment notifications
CREATE TRIGGER notify_on_comment_added
  AFTER INSERT ON public.case_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_added();