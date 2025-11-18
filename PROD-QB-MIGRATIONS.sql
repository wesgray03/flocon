-- QuickBooks Production Migrations
-- Run these in Supabase SQL Editor for Production Database
-- Date: 2025-11-18

-- ============================================================================
-- MIGRATION 1: Create qbo_tokens table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.qbo_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_refreshed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qbo_tokens_realm_id ON public.qbo_tokens(realm_id);
CREATE INDEX IF NOT EXISTS idx_qbo_tokens_active ON public.qbo_tokens(is_active) WHERE is_active = true;

ALTER TABLE public.qbo_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only can access QBO tokens"
  ON public.qbo_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qbo_tokens TO service_role;

-- ============================================================================
-- MIGRATION 2: Add QB columns to engagements
-- ============================================================================

ALTER TABLE engagements 
  ADD COLUMN IF NOT EXISTS qbo_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS qbo_job_id TEXT,
  ADD COLUMN IF NOT EXISTS qbo_last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_engagements_qbo_customer 
  ON engagements(qbo_customer_id) 
  WHERE qbo_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_engagements_qbo_job 
  ON engagements(qbo_job_id) 
  WHERE qbo_job_id IS NOT NULL;

-- ============================================================================
-- MIGRATION 3: Add QB columns to engagement_pay_apps
-- ============================================================================

ALTER TABLE engagement_pay_apps 
ADD COLUMN IF NOT EXISTS qbo_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS qbo_sync_status TEXT CHECK (qbo_sync_status IN ('pending', 'synced', 'error')),
ADD COLUMN IF NOT EXISTS qbo_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS qbo_payment_total NUMERIC(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS qbo_sync_error TEXT;

CREATE INDEX IF NOT EXISTS idx_engagement_pay_apps_qbo_invoice_id 
ON engagement_pay_apps(qbo_invoice_id) 
WHERE qbo_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_engagement_pay_apps_qbo_sync_status 
ON engagement_pay_apps(qbo_sync_status) 
WHERE qbo_sync_status IS NOT NULL;

-- ============================================================================
-- MIGRATION 4: Add QB columns to companies
-- ============================================================================

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS qbo_customer_id TEXT,
ADD COLUMN IF NOT EXISTS qbo_last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_companies_qbo_customer_id 
ON companies(qbo_customer_id) 
WHERE qbo_customer_id IS NOT NULL;

-- ============================================================================
-- MIGRATION 5: Create qbo_vendor_import_list table
-- ============================================================================

CREATE TABLE IF NOT EXISTS qbo_vendor_import_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qbo_vendor_import_list_name ON qbo_vendor_import_list(vendor_name);

ALTER TABLE qbo_vendor_import_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read vendor import list"
  ON qbo_vendor_import_list
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage vendor import list"
  ON qbo_vendor_import_list
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON qbo_vendor_import_list TO authenticated;
