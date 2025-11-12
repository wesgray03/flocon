-- Migration: Add bid_date column back to engagements table
-- Date: 2025-11-11
-- Purpose: Restore bid_date field that was accidentally removed

ALTER TABLE engagements
ADD COLUMN IF NOT EXISTS bid_date DATE;

COMMENT ON COLUMN engagements.bid_date IS 'Bid submission date for prospects';
