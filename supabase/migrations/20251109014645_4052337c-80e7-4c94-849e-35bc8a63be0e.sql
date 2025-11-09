-- Enable full row tracking for realtime updates
ALTER TABLE public.case_activities REPLICA IDENTITY FULL;