-- Create commissioners table
CREATE TABLE public.commissioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT,
  first_appearance_date TIMESTAMPTZ DEFAULT now(),
  total_cases INTEGER DEFAULT 0,
  bias_score NUMERIC(5,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name)
);

-- Create commissioner_bias_statements table
CREATE TABLE public.commissioner_bias_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commissioner_id UUID NOT NULL REFERENCES commissioners(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  bias_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'moderate', 'high')),
  quote TEXT NOT NULL,
  page_reference TEXT,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_commissioners_name ON commissioners(name);
CREATE INDEX idx_bias_statements_commissioner ON commissioner_bias_statements(commissioner_id);
CREATE INDEX idx_bias_statements_analysis ON commissioner_bias_statements(analysis_id);

-- Create function to calculate bias score
CREATE OR REPLACE FUNCTION calculate_commissioner_bias_score(commissioner_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  score NUMERIC := 0;
  high_count INTEGER;
  moderate_count INTEGER;
  low_count INTEGER;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE severity = 'high'),
    COUNT(*) FILTER (WHERE severity = 'moderate'),
    COUNT(*) FILTER (WHERE severity = 'low')
  INTO high_count, moderate_count, low_count
  FROM commissioner_bias_statements
  WHERE commissioner_id = commissioner_uuid;
  
  score := (high_count * 10) + (moderate_count * 5) + (low_count * 2);
  
  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to update bias score
CREATE OR REPLACE FUNCTION update_commissioner_bias_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE commissioners
  SET 
    bias_score = calculate_commissioner_bias_score(
      COALESCE(NEW.commissioner_id, OLD.commissioner_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.commissioner_id, OLD.commissioner_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER trigger_update_bias_score
AFTER INSERT OR DELETE ON commissioner_bias_statements
FOR EACH ROW
EXECUTE FUNCTION update_commissioner_bias_score();

-- Enable RLS
ALTER TABLE commissioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissioner_bias_statements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for commissioners
CREATE POLICY "Authenticated users can view commissioners"
ON commissioners FOR SELECT
USING (true);

CREATE POLICY "Admins can manage commissioners"
ON commissioners FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for bias statements
CREATE POLICY "Authenticated users can view bias statements"
ON commissioner_bias_statements FOR SELECT
USING (true);

CREATE POLICY "System can insert bias statements"
ON commissioner_bias_statements FOR INSERT
WITH CHECK (true);