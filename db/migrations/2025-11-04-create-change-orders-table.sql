-- Migration: Create change_orders table
-- Date: 2025-11-04
-- Purpose: Track change orders for projects

BEGIN;

-- 1) Create the change_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  co_number text,
  description text NOT NULL,
  amount numeric(15,2) DEFAULT 0,
  status text DEFAULT 'Pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) Add missing columns if they don't exist (for existing tables)
ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS co_number text;

ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS amount numeric(15,2) DEFAULT 0;

ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending';

ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS date date;

ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3) Add foreign key constraint to projects table
ALTER TABLE public.change_orders
  DROP CONSTRAINT IF EXISTS change_orders_project_id_fkey;

ALTER TABLE public.change_orders
  ADD CONSTRAINT change_orders_project_id_fkey 
  FOREIGN KEY (project_id) 
  REFERENCES public.projects(id) 
  ON DELETE CASCADE;

-- 4) Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_change_orders_project_id 
  ON public.change_orders(project_id);

CREATE INDEX IF NOT EXISTS idx_change_orders_date 
  ON public.change_orders(date DESC);

-- 4) Add comments to document the table
COMMENT ON TABLE public.change_orders IS 'Change orders for projects';
COMMENT ON COLUMN public.change_orders.co_number IS 'Change order number or identifier';
COMMENT ON COLUMN public.change_orders.description IS 'Description of the change order';
COMMENT ON COLUMN public.change_orders.amount IS 'Dollar amount of the change order';
COMMENT ON COLUMN public.change_orders.status IS 'Status: Pending, Approved, or Rejected';
COMMENT ON COLUMN public.change_orders.date IS 'Date of the change order';

-- 5) Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 6) Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_change_orders_updated_at ON public.change_orders;

CREATE TRIGGER update_change_orders_updated_at
  BEFORE UPDATE ON public.change_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Note: This table is now ready to use with the Change Orders page
-- The project_dashboard view already calculates co_amt from this table
