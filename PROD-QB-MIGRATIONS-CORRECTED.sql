-- =====================================================
-- QuickBooks Integration - Production Migration
-- Based on actual staging schema
-- =====================================================

-- Migration 1: Create qbo_tokens table
-- =====================================================
CREATE TABLE IF NOT EXISTS qbo_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id text NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  access_token_expires_at timestamptz NOT NULL,
  refresh_token_expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE qbo_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (service role only - manage via Supabase dashboard for specific users)
CREATE POLICY "Service role can access qbo_tokens" ON qbo_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger (if function exists)
DROP TRIGGER IF EXISTS update_qbo_tokens_updated_at ON qbo_tokens;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_qbo_tokens_updated_at
      BEFORE UPDATE ON qbo_tokens
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- Migration 2: Add qbo columns to companies
-- =====================================================
-- Note: companies uses qbo_id (not qbo_customer_id)
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS qbo_id text,
  ADD COLUMN IF NOT EXISTS qbo_last_synced_at timestamptz;

-- Add index for qbo_id lookups
CREATE INDEX IF NOT EXISTS idx_companies_qbo_id ON companies(qbo_id);


-- Migration 3: Add qbo columns to engagements
-- =====================================================
-- Note: engagements uses qbo_customer_id AND qbo_job_id
ALTER TABLE engagements
  ADD COLUMN IF NOT EXISTS qbo_customer_id text,
  ADD COLUMN IF NOT EXISTS qbo_job_id text,
  ADD COLUMN IF NOT EXISTS qbo_last_synced_at timestamptz;

-- Add indexes for QB lookups
CREATE INDEX IF NOT EXISTS idx_engagements_qbo_customer_id ON engagements(qbo_customer_id);
CREATE INDEX IF NOT EXISTS idx_engagements_qbo_job_id ON engagements(qbo_job_id);


-- Migration 4: Add qbo columns to engagement_pay_apps
-- =====================================================
ALTER TABLE engagement_pay_apps
  ADD COLUMN IF NOT EXISTS qbo_invoice_id text,
  ADD COLUMN IF NOT EXISTS qbo_sync_status text,
  ADD COLUMN IF NOT EXISTS qbo_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS qbo_payment_total numeric(12, 2),
  ADD COLUMN IF NOT EXISTS qbo_sync_error text;

-- Add index for invoice lookups
CREATE INDEX IF NOT EXISTS idx_engagement_pay_apps_qbo_invoice_id ON engagement_pay_apps(qbo_invoice_id);


-- Migration 5: Create qbo_vendor_import_list table
-- =====================================================
CREATE TABLE IF NOT EXISTS qbo_vendor_import_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qbo_vendor_id text NOT NULL,
  qbo_vendor_name text NOT NULL,
  qbo_company_name text,
  import_status text DEFAULT 'pending',
  matched_company_id uuid REFERENCES companies(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  imported_at timestamptz,
  error_message text,
  UNIQUE(qbo_vendor_id)
);

-- Enable RLS
ALTER TABLE qbo_vendor_import_list ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (service role only - manage via Supabase dashboard for specific users)
CREATE POLICY "Service role can access vendor import list" ON qbo_vendor_import_list
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger (if function exists)
DROP TRIGGER IF EXISTS update_qbo_vendor_import_list_updated_at ON qbo_vendor_import_list;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_qbo_vendor_import_list_updated_at
      BEFORE UPDATE ON qbo_vendor_import_list
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add index for vendor lookups
CREATE INDEX IF NOT EXISTS idx_qbo_vendor_import_list_vendor_id ON qbo_vendor_import_list(qbo_vendor_id);
CREATE INDEX IF NOT EXISTS idx_qbo_vendor_import_list_status ON qbo_vendor_import_list(import_status);
