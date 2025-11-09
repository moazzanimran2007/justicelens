-- Fix the log_stage_change function to have proper search_path
CREATE OR REPLACE FUNCTION public.log_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  old_stage_name TEXT;
  new_stage_name TEXT;
  old_priority TEXT;
  new_priority TEXT;
BEGIN
  -- Log case creation (INSERT)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
    VALUES (
      NEW.id,
      COALESCE(auth.uid(), NEW.user_id),
      'case_created',
      'Case created',
      jsonb_build_object('client_name', NEW.client_name, 'file_name', NEW.file_name)
    );
  END IF;
  
  -- Log stage changes (UPDATE)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
      SELECT name INTO old_stage_name FROM public.pipeline_stages WHERE id = OLD.stage_id;
      SELECT name INTO new_stage_name FROM public.pipeline_stages WHERE id = NEW.stage_id;
      
      INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        auth.uid(),
        'stage_changed',
        'Stage changed from ' || COALESCE(old_stage_name, 'None') || ' to ' || new_stage_name,
        jsonb_build_object('old_stage', old_stage_name, 'new_stage', new_stage_name)
      );
    END IF;
    
    -- Log assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        auth.uid(),
        'assignment_changed',
        CASE 
          WHEN NEW.assigned_to IS NULL THEN 'Case unassigned'
          ELSE 'Case assigned'
        END,
        jsonb_build_object('assigned_to', NEW.assigned_to)
      );
    END IF;
    
    -- Log priority changes
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      old_priority := COALESCE(OLD.priority, 'none');
      new_priority := COALESCE(NEW.priority, 'none');
      
      INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        auth.uid(),
        'priority_changed',
        'Priority changed from ' || old_priority || ' to ' || new_priority,
        jsonb_build_object('old_priority', old_priority, 'new_priority', new_priority)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;