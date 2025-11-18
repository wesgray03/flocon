-- Add QuickBooks sync columns to engagement_pay_apps table
-- Date: 2025-11-17
-- Purpose: Track invoice sync status with QuickBooks

BEGIN;

-- Add QB invoice ID column
ALTER TABLE engagement_pay_apps 
ADD COLUMN IF NOT EXISTS qbo_invoice_id TEXT;

-- Add sync status column
ALTER TABLE engagement_pay_apps 
ADD COLUMN IF NOT EXISTS qbo_sync_status TEXT 
CHECK (qbo_sync_status IN ('pending', 'synced', 'error'));

-- Add timestamp when synced
ALTER TABLE engagement_pay_apps 
ADD COLUMN IF NOT EXISTS qbo_synced_at TIMESTAMPTZ;

-- Add payment total from QB (for display purposes)
ALTER TABLE engagement_pay_apps 
ADD COLUMN IF NOT EXISTS qbo_payment_total NUMERIC(12,2) DEFAULT 0.00;

-- Add sync error message for troubleshooting
ALTER TABLE engagement_pay_apps 
ADD COLUMN IF NOT EXISTS qbo_sync_error TEXT;

-- Create index on qbo_invoice_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_engagement_pay_apps_qbo_invoice_id 
ON engagement_pay_apps(qbo_invoice_id) 
WHERE qbo_invoice_id IS NOT NULL;

-- Create index on sync status for filtering
CREATE INDEX IF NOT EXISTS idx_engagement_pay_apps_qbo_sync_status 
ON engagement_pay_apps(qbo_sync_status) 
WHERE qbo_sync_status IS NOT NULL;

-- Add comments
COMMENT ON COLUMN engagement_pay_apps.qbo_invoice_id IS 'QuickBooks Invoice ID';
COMMENT ON COLUMN engagement_pay_apps.qbo_sync_status IS 'Sync status: pending, synced, or error';
COMMENT ON COLUMN engagement_pay_apps.qbo_synced_at IS 'Last time this invoice was synced to QuickBooks';
COMMENT ON COLUMN engagement_pay_apps.qbo_payment_total IS 'Total payments received in QuickBooks';
COMMENT ON COLUMN engagement_pay_apps.qbo_sync_error IS 'Error message if sync failed';

COMMIT;
