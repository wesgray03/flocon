-- Migration: Add QBO cost cache table
-- Date: 2025-11-20
-- Purpose: Cache QuickBooks cost data to speed up Financial Overview loading

BEGIN;

-- Create table to cache QBO cost data per project
CREATE TABLE IF NOT EXISTS qbo_cost_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  qbo_job_id TEXT NOT NULL,
  
  -- Cost breakdown
  bills_total NUMERIC(15, 2) DEFAULT 0.00,
  purchases_total NUMERIC(15, 2) DEFAULT 0.00,
  payroll_total NUMERIC(15, 2) DEFAULT 0.00,
  credits_total NUMERIC(15, 2) DEFAULT 0.00,
  net_cost_to_date NUMERIC(15, 2) DEFAULT 0.00,
  
  -- Transaction counts
  bills_count INTEGER DEFAULT 0,
  purchases_count INTEGER DEFAULT 0,
  payroll_count INTEGER DEFAULT 0,
  credits_count INTEGER DEFAULT 0,
  
  -- Cache metadata
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one cache entry per engagement
  UNIQUE(engagement_id)
);

-- Indexes
CREATE INDEX idx_qbo_cost_cache_engagement ON qbo_cost_cache(engagement_id);
CREATE INDEX idx_qbo_cost_cache_qbo_job ON qbo_cost_cache(qbo_job_id);
CREATE INDEX idx_qbo_cost_cache_last_synced ON qbo_cost_cache(last_synced_at);

-- RLS
ALTER TABLE qbo_cost_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" 
ON qbo_cost_cache 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_qbo_cost_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_qbo_cost_cache_updated_at
BEFORE UPDATE ON qbo_cost_cache
FOR EACH ROW
EXECUTE FUNCTION update_qbo_cost_cache_updated_at();

COMMIT;

-- Usage:
-- 1. When loading Financial Overview, first check cache
-- 2. If cache is fresh (< 1 hour old), use cached data
-- 3. If cache is stale or missing, fetch from QBO and update cache
-- 4. Provide a "Refresh Costs" button to force a sync
