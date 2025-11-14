-- Add auto_number column to engagement_change_orders table
-- Migration: 2025-11-14-add-auto-number-to-change-orders

-- Add auto_number column (nullable initially for backfill)
ALTER TABLE engagement_change_orders
ADD COLUMN auto_number INTEGER;

-- Add comment describing the column
COMMENT ON COLUMN engagement_change_orders.auto_number IS 'Sequential auto-number for change orders within an engagement';

-- Create index for faster lookups
CREATE INDEX idx_engagement_change_orders_auto_number 
ON engagement_change_orders(engagement_id, auto_number);
