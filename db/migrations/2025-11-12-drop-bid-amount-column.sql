-- Migration: Drop bid_amount column from engagements table
-- Date: 2025-11-12
-- Purpose: Remove redundant bid_amount column as revenue is calculated from engagement_trades sum * probability percentage

BEGIN;

-- Drop bid_amount column (no longer needed)
ALTER TABLE engagements 
DROP COLUMN IF EXISTS bid_amount CASCADE;

COMMIT;
