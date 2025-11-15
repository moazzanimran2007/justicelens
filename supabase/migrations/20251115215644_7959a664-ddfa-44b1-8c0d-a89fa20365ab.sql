-- Insert default pipeline stages
INSERT INTO public.pipeline_stages (name, color, display_order)
VALUES
  ('Intake', '#3b82f6', 1),
  ('Review', '#8b5cf6', 2),
  ('Investigation', '#f59e0b', 3),
  ('Decision', '#10b981', 4),
  ('Closed', '#6b7280', 5)
ON CONFLICT (name) DO NOTHING;