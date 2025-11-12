-- Add budget_amount column to engagement_change_orders table
-- This represents the internal cost/budget for a change order
-- While 'amount' represents the customer-facing sales amount

ALTER TABLE engagement_change_orders 
ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(12, 2) DEFAULT 0;

COMMENT ON COLUMN engagement_change_orders.budget_amount IS 'Internal budget/cost amount for the change order';
COMMENT ON COLUMN engagement_change_orders.amount IS 'Customer-facing sales amount for the change order';
