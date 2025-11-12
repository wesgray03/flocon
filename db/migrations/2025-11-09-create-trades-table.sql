-- Migration: Create trades reference table
-- Date: 2025-11-09
-- Purpose: Replace numbered trade fields (06.61.13, etc.) with proper relational structure
-- Related: Prepares for prospect/project engagements system

BEGIN;

-- Create trades table with CSI MasterFormat divisions
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,  -- e.g., "06.61.13", "09.30.00"
  name TEXT NOT NULL,          -- e.g., "Milladen", "Hastings"
  division TEXT,               -- CSI division for grouping (e.g., "06 - Wood & Plastics", "09 - Finishes")
  description TEXT,            -- Full trade description
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for fast lookups by code (skip if exists)
CREATE INDEX IF NOT EXISTS idx_trades_code ON public.trades(code);
CREATE INDEX IF NOT EXISTS idx_trades_active ON public.trades(is_active) WHERE is_active = true;

-- Auto-update timestamp trigger
DROP TRIGGER IF EXISTS trigger_update_trades_updated_at ON public.trades;
CREATE OR REPLACE FUNCTION update_trades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trades_updated_at
BEFORE UPDATE ON public.trades
FOR EACH ROW
EXECUTE FUNCTION update_trades_updated_at();

-- Seed trades for commercial tile, stone, flooring & bathroom accessories company
INSERT INTO public.trades (code, name, division, description) VALUES
  ('09.30.00', 'Ceramic Tile', '09 - Finishes', 'Ceramic and porcelain tile installation'),
  ('09.30.13', 'Stone Tile', '09 - Finishes', 'Natural stone tile (marble, granite, travertine)'),
  ('09.63.00', 'Masonry Flooring', '09 - Finishes', 'Brick and stone masonry flooring'),
  ('09.64.00', 'Wood Flooring', '09 - Finishes', 'Hardwood and engineered wood flooring'),
  ('09.65.00', 'Resilient Flooring', '09 - Finishes', 'Vinyl, LVT, rubber, linoleum'),
  ('09.66.00', 'Terrazzo', '09 - Finishes', 'Terrazzo floor systems'),
  ('09.68.00', 'Carpet', '09 - Finishes', 'Carpet tile and broadloom'),
  ('09.77.00', 'Base & Trim', '09 - Finishes', 'Wall base, cove base, and trim'),
  ('10.28.00', 'Bathroom Accessories', '10 - Specialties', 'Toilet accessories, grab bars, mirrors, dispensers'),
  ('12.36.00', 'Countertops', '12 - Furnishings', 'Stone and solid surface countertops')
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- Usage notes:
-- Next step: Create engagement_trades junction table to link projects/prospects to trades
-- Then: Migrate any existing trade data from old columns to new structure
