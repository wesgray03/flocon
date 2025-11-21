-- Migration: Add is_retainage_billing flag to engagement_pay_apps
-- Date: 2025-11-21
-- Purpose: Track which pay apps are retainage releases so we can calculate net retainage held

BEGIN;

-- Add is_retainage_billing column
ALTER TABLE engagement_pay_apps
ADD COLUMN IF NOT EXISTS is_retainage_billing BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN engagement_pay_apps.is_retainage_billing IS 'True if this pay app is releasing previously held retainage (not billing new work)';

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_pay_apps_retainage_billing 
ON engagement_pay_apps(engagement_id, is_retainage_billing) 
WHERE is_retainage_billing = true;

COMMIT;
