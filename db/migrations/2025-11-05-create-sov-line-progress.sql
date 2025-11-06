-- Migration: Create SOV line progress tracking table
-- Date: 2025-11-05
-- Purpose: Track per-line progress for each pay application (AIA G703S continuation sheet)

BEGIN;

-- Create junction table to track SOV line progress per pay application
CREATE TABLE IF NOT EXISTS sov_line_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_app_id UUID NOT NULL REFERENCES pay_apps(id) ON DELETE CASCADE,
  sov_line_id UUID NOT NULL REFERENCES sov_lines(id) ON DELETE CASCADE,
  
  -- Column C: Scheduled Value (from sov_lines.extended_cost)
  scheduled_value NUMERIC(15, 2) NOT NULL,
  
  -- Column D: Work Completed From Previous Application
  previous_completed NUMERIC(15, 2) DEFAULT 0.00,
  
  -- Column E: Work Completed This Period
  current_completed NUMERIC(15, 2) DEFAULT 0.00,
  
  -- Column F: Materials Presently Stored (not in D or E)
  stored_materials NUMERIC(15, 2) DEFAULT 0.00,
  
  -- Column G: Total Completed and Stored to Date (D+E+F)
  total_completed_and_stored NUMERIC(15, 2) GENERATED ALWAYS AS 
    (previous_completed + current_completed + stored_materials) STORED,
  
  -- Column G/C: Percent Complete
  percent_complete NUMERIC(5, 2) GENERATED ALWAYS AS 
    (CASE WHEN scheduled_value > 0 
     THEN ((previous_completed + current_completed + stored_materials) / scheduled_value * 100)
     ELSE 0 END) STORED,
  
  -- Column H: Balance to Finish (C-G)
  balance_to_finish NUMERIC(15, 2) GENERATED ALWAYS AS 
    (scheduled_value - (previous_completed + current_completed + stored_materials)) STORED,
  
  -- Column I: Retainage
  retainage_amount NUMERIC(15, 2) DEFAULT 0.00,
  retainage_percent NUMERIC(5, 2) DEFAULT 5.00,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one progress entry per SOV line per pay app
  UNIQUE(pay_app_id, sov_line_id)
);

-- Create indexes for performance
CREATE INDEX idx_sov_line_progress_pay_app ON sov_line_progress(pay_app_id);
CREATE INDEX idx_sov_line_progress_sov_line ON sov_line_progress(sov_line_id);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sov_line_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sov_line_progress_updated_at
BEFORE UPDATE ON sov_line_progress
FOR EACH ROW
EXECUTE FUNCTION update_sov_line_progress_updated_at();

COMMIT;

-- Example query to get continuation sheet data for a pay app:
-- SELECT 
--   sl.line_code,
--   sl.description,
--   slp.scheduled_value,
--   slp.previous_completed,
--   slp.current_completed,
--   slp.stored_materials,
--   slp.total_completed_and_stored,
--   slp.percent_complete,
--   slp.balance_to_finish,
--   slp.retainage_amount
-- FROM sov_line_progress slp
-- JOIN sov_lines sl ON slp.sov_line_id = sl.id
-- WHERE slp.pay_app_id = '<pay-app-id>'
-- ORDER BY sl.line_code;
