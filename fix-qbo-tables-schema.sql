-- Fix QB tables schema to match staging
-- Drop and recreate with correct columns

-- Drop existing QB tables
DROP TABLE IF EXISTS qbo_vendor_import_list CASCADE;
DROP TABLE IF EXISTS qbo_tokens CASCADE;

-- Recreate qbo_tokens with correct schema
CREATE TABLE IF NOT EXISTS qbo_tokens (
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

CREATE INDEX IF NOT EXISTS idx_qbo_tokens_realm_id ON qbo_tokens(realm_id);
CREATE INDEX IF NOT EXISTS idx_qbo_tokens_active ON qbo_tokens(is_active) WHERE is_active = true;

ALTER TABLE qbo_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can access qbo_tokens" ON qbo_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);

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

-- Recreate qbo_vendor_import_list with correct schema
CREATE TABLE IF NOT EXISTS qbo_vendor_import_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qbo_vendor_import_list_name ON qbo_vendor_import_list(vendor_name);

ALTER TABLE qbo_vendor_import_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can access vendor import list" ON qbo_vendor_import_list
  FOR ALL
  USING (true)
  WITH CHECK (true);

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
