-- Migration: Create engagement_trades junction table
-- Date: 2025-11-09
-- Purpose: Link engagements (prospects/projects) to trades with estimated/bid amounts
-- Replaces direct trade columns like "06.61.13", "09.30.00" with relational structure

BEGIN;

-- Create junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.engagement_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  
  -- Financial tracking per trade
  estimated_amount NUMERIC(14,2),      -- Initial estimate/bid amount
  actual_cost NUMERIC(14,2),           -- Actual cost (for projects)
  notes TEXT,                          -- Trade-specific notes
  
  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique trade per engagement
  UNIQUE(engagement_id, trade_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_engagement_trades_engagement ON public.engagement_trades(engagement_id);
CREATE INDEX IF NOT EXISTS idx_engagement_trades_trade ON public.engagement_trades(trade_id);

-- Auto-update timestamp trigger
DROP TRIGGER IF EXISTS trigger_update_engagement_trades_updated_at ON public.engagement_trades;

CREATE OR REPLACE FUNCTION update_engagement_trades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_engagement_trades_updated_at
BEFORE UPDATE ON public.engagement_trades
FOR EACH ROW
EXECUTE FUNCTION update_engagement_trades_updated_at();

-- Create convenience view for engagement trade summaries
CREATE OR REPLACE VIEW public.v_engagement_trade_summary AS
SELECT 
  e.id AS engagement_id,
  e.name AS engagement_name,
  e.type AS engagement_type,
  COUNT(et.id) AS trade_count,
  SUM(et.estimated_amount) AS total_estimated,
  SUM(et.actual_cost) AS total_actual_cost,
  COALESCE(SUM(et.estimated_amount), 0) - COALESCE(SUM(et.actual_cost), 0) AS variance
FROM public.engagements e
LEFT JOIN public.engagement_trades et ON et.engagement_id = e.id
GROUP BY e.id, e.name, e.type;

-- Create view for detailed trade breakdown per engagement
CREATE OR REPLACE VIEW public.v_engagement_trades_detail AS
SELECT 
  e.id AS engagement_id,
  e.name AS engagement_name,
  e.type AS engagement_type,
  t.code AS trade_code,
  t.name AS trade_name,
  t.division AS trade_division,
  et.estimated_amount,
  et.actual_cost,
  et.notes AS trade_notes,
  et.created_at AS trade_added_at
FROM public.engagements e
INNER JOIN public.engagement_trades et ON et.engagement_id = e.id
INNER JOIN public.trades t ON t.id = et.trade_id
ORDER BY e.name, t.code;

COMMIT;

-- Usage examples:
-- 
-- Add a trade to a prospect/project:
--   INSERT INTO engagement_trades (engagement_id, trade_id, estimated_amount)
--   VALUES ('uuid-here', 'trade-uuid-here', 125000.00);
--
-- Get all trades for an engagement:
--   SELECT * FROM v_engagement_trades_detail WHERE engagement_id = 'uuid-here';
--
-- Get trade summary:
--   SELECT * FROM v_engagement_trade_summary WHERE engagement_id = 'uuid-here';
