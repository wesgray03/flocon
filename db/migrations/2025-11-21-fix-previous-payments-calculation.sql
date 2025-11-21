-- Migration: Fix previous_payments calculation in pay apps
-- Date: 2025-11-21
-- Purpose: Recalculate previous_payments to use delta method instead of summing all payments
--          This fixes issues where retainage billing was incorrectly included in previous_payments

BEGIN;

-- Create function to recalculate previous_payments for all pay apps
CREATE OR REPLACE FUNCTION recalculate_previous_payments()
RETURNS void AS $$
DECLARE
  pay_app_record RECORD;
  prev_pay_app_record RECORD;
  new_previous_payments NUMERIC(15, 2);
BEGIN
  -- Loop through all pay apps ordered by engagement and pay app number
  FOR pay_app_record IN 
    SELECT id, engagement_id, pay_app_number, total_earned_less_retainage
    FROM engagement_pay_apps 
    ORDER BY engagement_id, COALESCE(pay_app_number::integer, 0)
  LOOP
    -- Find the previous pay app for this engagement
    SELECT total_earned_less_retainage
    INTO prev_pay_app_record
    FROM engagement_pay_apps
    WHERE engagement_id = pay_app_record.engagement_id
      AND pay_app_number IS NOT NULL
      AND pay_app_record.pay_app_number IS NOT NULL
      AND pay_app_number::integer < pay_app_record.pay_app_number::integer
    ORDER BY pay_app_number::integer DESC
    LIMIT 1;
    
    -- Calculate new previous_payments value
    IF prev_pay_app_record IS NOT NULL THEN
      new_previous_payments := COALESCE(prev_pay_app_record.total_earned_less_retainage, 0);
    ELSE
      new_previous_payments := 0;
    END IF;
    
    -- Update the pay app
    UPDATE engagement_pay_apps
    SET 
      previous_payments = new_previous_payments,
      updated_at = NOW()
    WHERE id = pay_app_record.id
      AND previous_payments != new_previous_payments;
    
    IF FOUND THEN
      RAISE NOTICE 'Updated pay app % (engagement %): previous_payments = %', 
        pay_app_record.pay_app_number, pay_app_record.engagement_id, new_previous_payments;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT recalculate_previous_payments();

-- Drop the temporary function
DROP FUNCTION recalculate_previous_payments();

COMMENT ON COLUMN engagement_pay_apps.previous_payments IS 'Cumulative total earned less retainage through the previous pay app (not including retainage releases)';

COMMIT;
