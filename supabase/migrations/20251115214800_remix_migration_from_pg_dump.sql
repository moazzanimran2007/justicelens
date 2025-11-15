--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'investigator',
    'attorney',
    'advocate'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) 
  DO UPDATE SET 
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: log_stage_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_stage_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  old_stage_name TEXT;
  new_stage_name TEXT;
  old_priority TEXT;
  new_priority TEXT;
  activity_user_id UUID;
BEGIN
  -- Determine user_id: use auth.uid() if available, otherwise use case owner
  activity_user_id := COALESCE(auth.uid(), NEW.user_id);
  
  -- Log case creation (INSERT)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
    VALUES (
      NEW.id,
      activity_user_id,
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
        activity_user_id,
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
        activity_user_id,
        'assignment_changed',
        CASE 
          WHEN NEW.assigned_to IS NULL THEN 'Case unassigned'
          ELSE 'Case assigned'
        END,
        jsonb_build_object('assigned_to', NEW.assigned_to)
      );
    END IF;
    
    -- Log priority changes (including automatic ones from AI analysis)
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      old_priority := COALESCE(OLD.priority, 'none');
      new_priority := COALESCE(NEW.priority, 'none');
      
      INSERT INTO public.case_activities (case_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        activity_user_id,
        'priority_changed',
        CASE 
          WHEN auth.uid() IS NULL THEN 'Priority auto-set to ' || new_priority || ' based on analysis'
          ELSE 'Priority changed from ' || old_priority || ' to ' || new_priority
        END,
        jsonb_build_object('old_priority', old_priority, 'new_priority', new_priority, 'auto_set', auth.uid() IS NULL)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_case_assignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_case_assignment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: notify_comment_added(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_comment_added() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: notify_mentioned_users(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_mentioned_users() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: sync_user_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_user_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only update if email actually changed
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.profiles
    SET email = NEW.email,
        updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: analyses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analyses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size integer NOT NULL,
    analysis_modules text[] DEFAULT '{}'::text[] NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    results jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stage_id uuid,
    assigned_to uuid,
    priority text DEFAULT 'medium'::text,
    case_number text,
    client_name text,
    CONSTRAINT analyses_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT analyses_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: case_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    user_id uuid NOT NULL,
    activity_type text NOT NULL,
    description text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.case_activities REPLICA IDENTITY FULL;


--
-- Name: case_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    user_id uuid NOT NULL,
    comment_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    mentioned_users uuid[] DEFAULT '{}'::uuid[]
);

ALTER TABLE ONLY public.case_comments REPLICA IDENTITY FULL;


--
-- Name: legal_memos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_memos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    analysis_id uuid NOT NULL,
    client_name text,
    cdcr_number text,
    contact_information text,
    date_of_birth text,
    short_summary text,
    evidence_used_to_convict text[],
    potential_theory_of_case text,
    date_of_crime text,
    location_of_crime text,
    date_of_arrest text,
    date_of_conviction text,
    convicted_of text,
    county_of_conviction text,
    sentence text,
    parole_eligibility_date text,
    prior_parole_hearing_result text,
    client_priors text,
    trial_court_case_no text,
    trial_court_judge_dept text,
    trial_attorney text,
    prosecuting_attorney text,
    co_defendant text,
    co_defendant_attorney text,
    appellate_case_no text,
    appellate_attorneys text,
    direct_appeal_date text,
    direct_appeal_issues text[],
    petition_for_review_date text,
    petition_for_review_issues text[],
    habeas_petition_date text,
    habeas_petition_issues text[],
    prosecution_presented text,
    defense_presented text,
    wrongful_conviction_issues text[],
    innocence_claims jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    people_mentioned jsonb DEFAULT '[]'::jsonb,
    people_additional_info jsonb DEFAULT '[]'::jsonb
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    case_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: pipeline_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pipeline_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    display_order integer NOT NULL,
    color text DEFAULT '#6B7280'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    nickname text,
    job_title text,
    team_name text,
    bio text
);


--
-- Name: team_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_name text DEFAULT 'Justice Team'::text NOT NULL,
    team_icon text DEFAULT '⚖️'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    logo_url text
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: analyses analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analyses
    ADD CONSTRAINT analyses_pkey PRIMARY KEY (id);


--
-- Name: case_activities case_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_activities
    ADD CONSTRAINT case_activities_pkey PRIMARY KEY (id);


--
-- Name: case_comments case_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_comments
    ADD CONSTRAINT case_comments_pkey PRIMARY KEY (id);


--
-- Name: legal_memos legal_memos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_memos
    ADD CONSTRAINT legal_memos_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: pipeline_stages pipeline_stages_display_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline_stages
    ADD CONSTRAINT pipeline_stages_display_order_key UNIQUE (display_order);


--
-- Name: pipeline_stages pipeline_stages_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline_stages
    ADD CONSTRAINT pipeline_stages_name_key UNIQUE (name);


--
-- Name: pipeline_stages pipeline_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline_stages
    ADD CONSTRAINT pipeline_stages_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: team_settings team_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_settings
    ADD CONSTRAINT team_settings_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: analyses log_case_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_case_changes AFTER INSERT OR UPDATE ON public.analyses FOR EACH ROW EXECUTE FUNCTION public.log_stage_change();


--
-- Name: case_comments notify_mentioned_users_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_mentioned_users_trigger AFTER INSERT ON public.case_comments FOR EACH ROW EXECUTE FUNCTION public.notify_mentioned_users();


--
-- Name: analyses notify_on_case_assignment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_on_case_assignment AFTER UPDATE ON public.analyses FOR EACH ROW EXECUTE FUNCTION public.notify_case_assignment();


--
-- Name: case_comments notify_on_comment_added; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_on_comment_added AFTER INSERT ON public.case_comments FOR EACH ROW EXECUTE FUNCTION public.notify_comment_added();


--
-- Name: analyses update_analyses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_analyses_updated_at BEFORE UPDATE ON public.analyses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: case_comments update_case_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_case_comments_updated_at BEFORE UPDATE ON public.case_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: legal_memos update_legal_memos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_legal_memos_updated_at BEFORE UPDATE ON public.legal_memos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: team_settings update_team_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_team_settings_updated_at BEFORE UPDATE ON public.team_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: analyses analyses_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analyses
    ADD CONSTRAINT analyses_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);


--
-- Name: analyses analyses_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analyses
    ADD CONSTRAINT analyses_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.pipeline_stages(id);


--
-- Name: analyses analyses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analyses
    ADD CONSTRAINT analyses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: case_activities case_activities_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_activities
    ADD CONSTRAINT case_activities_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.analyses(id) ON DELETE CASCADE;


--
-- Name: case_comments case_comments_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_comments
    ADD CONSTRAINT case_comments_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.analyses(id) ON DELETE CASCADE;


--
-- Name: case_comments case_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_comments
    ADD CONSTRAINT case_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: legal_memos legal_memos_analysis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_memos
    ADD CONSTRAINT legal_memos_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.analyses(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.analyses(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pipeline_stages Admins can delete pipeline stages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete pipeline stages" ON public.pipeline_stages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pipeline_stages Admins can insert pipeline stages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert pipeline stages" ON public.pipeline_stages FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can update any profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pipeline_stages Admins can update pipeline stages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update pipeline stages" ON public.pipeline_stages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: analyses All authenticated users can view cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated users can view cases" ON public.analyses FOR SELECT TO authenticated USING (true);


--
-- Name: pipeline_stages Anyone authenticated can view stages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone authenticated can view stages" ON public.pipeline_stages FOR SELECT TO authenticated USING (true);


--
-- Name: team_settings Anyone authenticated can view team settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone authenticated can view team settings" ON public.team_settings FOR SELECT TO authenticated USING (true);


--
-- Name: notifications Authenticated users can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: team_settings Only admins can insert team settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert team settings" ON public.team_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: team_settings Only admins can update team settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update team settings" ON public.team_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Profiles are viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: case_activities Users can create activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create activities" ON public.case_activities FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: case_comments Users can create comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create comments" ON public.case_comments FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: analyses Users can create their own analyses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own analyses" ON public.analyses FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: analyses Users can delete their own analyses or admins can delete any; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own analyses or admins can delete any" ON public.analyses FOR DELETE USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: case_comments Users can delete their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own comments" ON public.case_comments FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: legal_memos Users can delete their own legal memos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own legal memos" ON public.legal_memos FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.analyses
  WHERE ((analyses.id = legal_memos.analysis_id) AND (analyses.user_id = auth.uid())))));


--
-- Name: notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: legal_memos Users can insert legal memos for their analyses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert legal memos for their analyses" ON public.legal_memos FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.analyses
  WHERE ((analyses.id = legal_memos.analysis_id) AND (analyses.user_id = auth.uid())))));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: analyses Users can update cases with stage workflow support; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update cases with stage workflow support" ON public.analyses FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (auth.uid() = user_id) OR (auth.uid() = assigned_to)));


--
-- Name: case_comments Users can update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own comments" ON public.case_comments FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: legal_memos Users can update their own legal memos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own legal memos" ON public.legal_memos FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.analyses
  WHERE ((analyses.id = legal_memos.analysis_id) AND (analyses.user_id = auth.uid())))));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: case_activities Users can view activities for accessible cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view activities for accessible cases" ON public.case_activities FOR SELECT TO authenticated USING (true);


--
-- Name: user_roles Users can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);


--
-- Name: case_comments Users can view comments for accessible cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view comments for accessible cases" ON public.case_comments FOR SELECT TO authenticated USING (true);


--
-- Name: legal_memos Users can view their own legal memos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own legal memos" ON public.legal_memos FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.analyses
  WHERE ((analyses.id = legal_memos.analysis_id) AND (analyses.user_id = auth.uid())))));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: analyses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

--
-- Name: case_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.case_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: case_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.case_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_memos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_memos ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: pipeline_stages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: team_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


