-- Migration: Fix retainage calculations in pay apps
-- Date: 2025-11-20
-- Purpose: Recalculate retainage_completed_work to be period-specific instead of cumulative
--          This fixes the issue where retainage was being double-counted when summing across pay apps

BEGIN;

-- The issue: Both retainage_completed_work and total_retainage were storing the same value
-- (cumulative retainage on all work to date). This caused double-counting when billing final retainage.
--
-- The fix: retainage_completed_work should only contain the NEW retainage withheld in the current period,
-- while total_retainage remains the cumulative total.
--
-- We need to recalculate retainage_completed_work from the sov_line_progress data for each pay app.

-- Create a temporary function to recalculate retainage for all pay apps
CREATE OR REPLACE FUNCTION recalculate_pay_app_retainage()
RETURNS void AS $$
DECLARE
  pay_app_record RECORD;
  current_period_retainage NUMERIC(15, 2);
  total_cumulative_retainage NUMERIC(15, 2);
BEGIN
  -- Loop through all pay apps
  FOR pay_app_record IN 
    SELECT id, engagement_id 
    FROM engagement_pay_apps 
    ORDER BY engagement_id, pay_app_number
  LOOP
    -- Calculate current period retainage (only on current_completed + stored_materials)
    SELECT COALESCE(
      SUM(
        ROUND(
          (slp.current_completed + slp.stored_materials) * 
          (slp.retainage_percent / 100.0) * 100
        ) / 100
      ), 
      0
    )
    INTO current_period_retainage
    FROM engagement_sov_line_progress slp
    WHERE slp.pay_app_id = pay_app_record.id;
    
    -- Calculate total cumulative retainage (on all work to date)
    SELECT COALESCE(
      SUM(
        ROUND(
          (slp.previous_completed + slp.current_completed + slp.stored_materials) * 
          (slp.retainage_percent / 100.0) * 100
        ) / 100
      ), 
      0
    )
    INTO total_cumulative_retainage
    FROM engagement_sov_line_progress slp
    WHERE slp.pay_app_id = pay_app_record.id;
    
    -- Update the pay app with corrected values
    UPDATE engagement_pay_apps
    SET 
      retainage_completed_work = current_period_retainage,
      total_retainage = total_cumulative_retainage,
      updated_at = NOW()
    WHERE id = pay_app_record.id;
    
    RAISE NOTICE 'Updated pay app %: retainage_completed_work=%, total_retainage=%', 
      pay_app_record.id, current_period_retainage, total_cumulative_retainage;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT recalculate_pay_app_retainage();

-- Drop the temporary function
DROP FUNCTION recalculate_pay_app_retainage();

COMMIT;

-- Verification query (run this after migration to verify):
-- SELECT 
--   epa.id,
--   epa.pay_app_number,
--   epa.retainage_completed_work as current_period,
--   epa.total_retainage as cumulative,
--   (
--     SELECT SUM(
--       ROUND(
--         (slp.current_completed + slp.stored_materials) * 
--         (slp.retainage_percent / 100.0) * 100
--       ) / 100
--     )
--     FROM engagement_sov_line_progress slp
--     WHERE slp.pay_app_id = epa.id
--   ) as calculated_current
-- FROM engagement_pay_apps epa
-- ORDER BY epa.engagement_id, epa.pay_app_number;
