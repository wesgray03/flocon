-- Migration: Enhance SOV lines for AIA G703S tracking
-- Date: 2025-11-05
-- Purpose: Add columns to track work progress per pay period

BEGIN;

-- Add columns to sov_lines for AIA-style tracking
ALTER TABLE sov_lines
ADD COLUMN IF NOT EXISTS retainage_percent NUMERIC(5, 2) DEFAULT 5.00;

-- Note: We'll track period-specific progress (previous_completed, current_completed, stored_materials)
-- in a separate junction table (sov_line_progress) linked to pay_apps
-- This allows historical tracking of progress per pay application

COMMIT;
