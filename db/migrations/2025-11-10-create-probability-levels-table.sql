-- Migration: Create probability_levels reference table
-- Date: 2025-11-10
-- Purpose: Standardize probability values and percentages across the application

BEGIN;

-- 1. Create probability_levels table
CREATE TABLE IF NOT EXISTS public.probability_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  order_index INTEGER NOT NULL,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.probability_levels IS 'Reference table for standardized probability levels used in prospects';
COMMENT ON COLUMN public.probability_levels.name IS 'Display name (e.g., Doubtful, Possible, Probable, Definite)';
COMMENT ON COLUMN public.probability_levels.percentage IS 'Default percentage value (0-100)';
COMMENT ON COLUMN public.probability_levels.order_index IS 'Sort order for display in dropdowns';
COMMENT ON COLUMN public.probability_levels.color IS 'Hex color code for UI display';

-- 2. Insert standard probability levels
INSERT INTO public.probability_levels (name, percentage, order_index, color) VALUES
  ('Doubtful', 10, 1, '#94a3b8'),
  ('Possible', 25, 2, '#3b82f6'),
  ('Probable', 50, 3, '#f59e0b'),
  ('Definite', 75, 4, '#10b981');

-- 3. Enable RLS
ALTER TABLE public.probability_levels ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policy (read-only for all authenticated users)
CREATE POLICY "Allow read access to all authenticated users"
  ON public.probability_levels
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_probability_levels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER probability_levels_updated_at
  BEFORE UPDATE ON public.probability_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_probability_levels_updated_at();

-- 6. Create index for faster lookups
CREATE INDEX idx_probability_levels_name ON public.probability_levels(name);
CREATE INDEX idx_probability_levels_order ON public.probability_levels(order_index) WHERE is_active = true;

COMMIT;
