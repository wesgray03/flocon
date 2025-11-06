-- db/migrations/2025-11-04-create-pay-apps-table.sql
-- Create pay_apps table for tracking pay applications/billings
-- If the table already exists, add missing columns

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS pay_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pay_app_number TEXT,
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) DEFAULT 0.00,
  period_start DATE,
  period_end DATE,
  date_submitted DATE,
  date_paid DATE,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_apps' AND column_name = 'pay_app_number') THEN
    ALTER TABLE pay_apps ADD COLUMN pay_app_number TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_apps' AND column_name = 'description') THEN
    ALTER TABLE pay_apps ADD COLUMN description TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_apps' AND column_name = 'amount') THEN
    ALTER TABLE pay_apps ADD COLUMN amount NUMERIC(15, 2) DEFAULT 0.00;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_apps' AND column_name = 'period_start') THEN
    ALTER TABLE pay_apps ADD COLUMN period_start DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_apps' AND column_name = 'period_end') THEN
    ALTER TABLE pay_apps ADD COLUMN period_end DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_apps' AND column_name = 'date_submitted') THEN
    ALTER TABLE pay_apps ADD COLUMN date_submitted DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_apps' AND column_name = 'date_paid') THEN
    ALTER TABLE pay_apps ADD COLUMN date_paid DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_apps' AND column_name = 'status') THEN
    ALTER TABLE pay_apps ADD COLUMN status TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_apps' AND column_name = 'created_at') THEN
    ALTER TABLE pay_apps ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_apps' AND column_name = 'updated_at') THEN
    ALTER TABLE pay_apps ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- Create index on project_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_pay_apps_project_id ON pay_apps(project_id);

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION update_pay_apps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS pay_apps_updated_at ON pay_apps;
CREATE TRIGGER pay_apps_updated_at
  BEFORE UPDATE ON pay_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_pay_apps_updated_at();
