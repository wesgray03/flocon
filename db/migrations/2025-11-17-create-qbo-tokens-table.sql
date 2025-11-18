-- Migration: Create QuickBooks Online tokens table
-- Date: 2025-11-17
-- Purpose: Store OAuth tokens for QuickBooks Online API integration

-- Create qbo_tokens table
CREATE TABLE IF NOT EXISTS public.qbo_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id TEXT NOT NULL UNIQUE, -- QuickBooks Company ID
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL, -- When access token expires (1 hour from issue)
  refresh_expires_at TIMESTAMPTZ NOT NULL, -- When refresh token expires (100 days from issue)
  scope TEXT, -- OAuth scopes granted
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_refreshed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by realm_id
CREATE INDEX IF NOT EXISTS idx_qbo_tokens_realm_id ON public.qbo_tokens(realm_id);

-- Index for finding active tokens
CREATE INDEX IF NOT EXISTS idx_qbo_tokens_active ON public.qbo_tokens(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.qbo_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can access tokens (security-sensitive)
-- Frontend should never directly access this table
CREATE POLICY "Service role only can access QBO tokens"
  ON public.qbo_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_qbo_tokens_updated_at
  BEFORE UPDATE ON public.qbo_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qbo_tokens TO service_role;

-- Comments for documentation
COMMENT ON TABLE public.qbo_tokens IS 'Stores QuickBooks Online OAuth tokens for API integration';
COMMENT ON COLUMN public.qbo_tokens.realm_id IS 'QuickBooks Company ID - unique identifier for QBO company';
COMMENT ON COLUMN public.qbo_tokens.access_token IS 'OAuth access token - expires in 1 hour';
COMMENT ON COLUMN public.qbo_tokens.refresh_token IS 'OAuth refresh token - expires in 100 days';
COMMENT ON COLUMN public.qbo_tokens.expires_at IS 'When the access token expires (1 hour from issue)';
COMMENT ON COLUMN public.qbo_tokens.refresh_expires_at IS 'When the refresh token expires (100 days from issue)';
