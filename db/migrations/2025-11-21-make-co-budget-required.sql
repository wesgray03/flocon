-- Migration: Make change order budget_amount required
-- Date: 2025-11-21
-- Purpose: Ensure all change orders have a cost budget for accurate profit tracking

BEGIN;

-- Add NOT NULL constraint to budget_amount
-- First set any NULL values to 0 (though backfill script should have handled this)
UPDATE engagement_change_orders
SET budget_amount = 0
WHERE budget_amount IS NULL AND deleted = false;

-- Now add the constraint
ALTER TABLE engagement_change_orders
ALTER COLUMN budget_amount SET NOT NULL;

-- Add default value for new records
ALTER TABLE engagement_change_orders
ALTER COLUMN budget_amount SET DEFAULT 0;

-- Add comment
COMMENT ON COLUMN engagement_change_orders.budget_amount IS 'Cost budget for this change order (required). Should be calculated as amount * (1 - desired_margin_percent)';

COMMIT;
