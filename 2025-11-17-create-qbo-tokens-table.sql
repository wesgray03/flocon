-- Migration: Create QuickBooks Online tokens table
-- Run this directly in Supabase SQL Editor
-- Date: 2025-11-17

-- Create qbo_tokens table
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qbo_tokens_realm_id ON public.qbo_tokens(realm_id);
CREATE INDEX IF NOT EXISTS idx_qbo_tokens_active ON public.qbo_tokens(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.qbo_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can access tokens
DROP POLICY IF EXISTS "Service role only can access QBO tokens" ON public.qbo_tokens;
CREATE POLICY "Service role only can access QBO tokens"
  ON public.qbo_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_qbo_tokens_updated_at ON public.qbo_tokens;
CREATE TRIGGER update_qbo_tokens_updated_at
  BEFORE UPDATE ON public.qbo_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qbo_tokens TO service_role;
