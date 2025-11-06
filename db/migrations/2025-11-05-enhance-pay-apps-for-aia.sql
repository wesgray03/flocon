-- Migration: Enhance pay_apps for AIA G703S tracking
-- Date: 2025-11-05
-- Purpose: Add comprehensive fields for AIA-style pay application tracking

BEGIN;

-- Add columns to pay_apps for AIA G703S format
ALTER TABLE pay_apps
ADD COLUMN IF NOT EXISTS period_start DATE,
ADD COLUMN IF NOT EXISTS period_end DATE,
ADD COLUMN IF NOT EXISTS total_completed_and_stored NUMERIC(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS retainage_completed_work NUMERIC(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS retainage_stored_materials NUMERIC(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_retainage NUMERIC(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_earned_less_retainage NUMERIC(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS previous_payments NUMERIC(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS current_payment_due NUMERIC(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS balance_to_finish NUMERIC(15, 2) DEFAULT 0.00;

-- Update existing rows to use amount for backward compatibility
UPDATE pay_apps 
SET current_payment_due = amount 
WHERE current_payment_due = 0 AND amount IS NOT NULL;

COMMIT;
