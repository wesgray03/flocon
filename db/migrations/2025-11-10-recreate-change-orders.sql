-- Migration: Drop old change_orders table and create new structure
-- Date: 2025-11-10
-- Matches Excel template structure

-- Step 1: Drop the old table completely
DROP TABLE IF EXISTS public.change_orders CASCADE;

-- Step 2: Create new change_orders table with proper structure
CREATE TABLE public.change_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  
  -- Core fields
  current_status TEXT NOT NULL DEFAULT 'Open' CHECK (current_status IN ('Open', 'Authorized', 'Issued', 'Closed')),
  description TEXT NOT NULL DEFAULT '',
  notes TEXT,
  
  -- Dates (auto-filled based on status changes)
  date_requested TIMESTAMP WITH TIME ZONE DEFAULT now(),
  date_authorized TIMESTAMP WITH TIME ZONE,
  date_issued TIMESTAMP WITH TIME ZONE,
  
  -- Amount
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Customer reference
  customer_co_number TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Soft delete
  deleted BOOLEAN NOT NULL DEFAULT false
);

-- Indexes
CREATE INDEX idx_change_orders_engagement_id ON public.change_orders(engagement_id);
CREATE INDEX idx_change_orders_status ON public.change_orders(current_status) WHERE deleted = false;
CREATE INDEX idx_change_orders_deleted ON public.change_orders(deleted);

-- RLS
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" 
ON public.change_orders 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_change_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Auto-set date_authorized when status changes to Authorized
  IF NEW.current_status = 'Authorized' AND OLD.current_status != 'Authorized' THEN
    NEW.date_authorized = now();
  END IF;
  
  -- Auto-set date_issued when status changes to Issued
  IF NEW.current_status = 'Issued' AND OLD.current_status != 'Issued' THEN
    NEW.date_issued = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_change_orders_updated_at
  BEFORE UPDATE ON public.change_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_change_orders_updated_at();

-- Comment on table
COMMENT ON TABLE public.change_orders IS 'Change orders for projects with status workflow tracking';
