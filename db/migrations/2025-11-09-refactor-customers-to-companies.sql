-- Migration: Refactor customers table to companies with company types
-- Date: 2025-11-09
-- Purpose: Rename customers to companies and add support for Contractors, Architects, and Owners

BEGIN;

-- Step 1: Rename the table
ALTER TABLE public.customers RENAME TO companies;

-- Step 2: Add new columns
ALTER TABLE public.companies 
  ADD COLUMN company_type TEXT NOT NULL DEFAULT 'Contractor',
  ADD COLUMN is_customer BOOLEAN NOT NULL DEFAULT true;

-- Step 3: Add check constraint for valid company types
ALTER TABLE public.companies
  ADD CONSTRAINT company_type_check 
  CHECK (company_type IN ('Contractor', 'Architect', 'Owner'));

-- Step 4: Update existing records (all current customers are contractors who are customers)
UPDATE public.companies
SET 
  company_type = 'Contractor',
  is_customer = true
WHERE company_type = 'Contractor'; -- This is redundant but explicit

-- Step 5: Update foreign key references in engagements table
-- The FK constraint name will automatically update when we rename the table,
-- but let's verify the reference is correct
DO $$
BEGIN
  -- Check if the FK exists with old name and rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'engagements_customer_id_fkey' 
    AND table_name = 'engagements'
  ) THEN
    ALTER TABLE public.engagements 
      RENAME CONSTRAINT engagements_customer_id_fkey 
      TO engagements_company_id_fkey;
  END IF;
END $$;

-- Step 6: Rename the customer_id column in engagements to company_id
ALTER TABLE public.engagements 
  RENAME COLUMN customer_id TO company_id;

-- Step 7: Update the project_dashboard view to use new table and column names
DROP VIEW IF EXISTS public.project_dashboard CASCADE;

CREATE OR REPLACE VIEW public.project_dashboard AS
SELECT 
  e.id,
  e.qbid,
  e.name AS project_name,
  co.name AS customer_name,  -- Still calling it customer_name for view compatibility
  co.company_type,           -- Add company type to view
  co.is_customer,            -- Add is_customer flag to view
  e.owner AS manager,
  e.sales AS owner,
  e.start_date,
  e.end_date,
  e.stage_id,
  s.name AS stage_name,
  s."order" AS stage_order,
  e.sharepoint_folder,
  COALESCE(e.contract_amount, 0::numeric) AS contract_amt,
  COALESCE((
    SELECT SUM(change_orders.amount)
    FROM change_orders
    WHERE change_orders.project_id = e.id
  ), 0::numeric) AS co_amt,
  COALESCE(e.contract_amount, 0::numeric) + COALESCE((
    SELECT SUM(change_orders.amount)
    FROM change_orders
    WHERE change_orders.project_id = e.id
  ), 0::numeric) AS total_amt,
  COALESCE((
    SELECT SUM(pay_apps.amount)
    FROM pay_apps
    WHERE pay_apps.project_id = e.id
  ), 0::numeric) AS billed_amt,
  COALESCE(e.contract_amount, 0::numeric) + COALESCE((
    SELECT SUM(change_orders.amount)
    FROM change_orders
    WHERE change_orders.project_id = e.id
  ), 0::numeric) - COALESCE((
    SELECT SUM(pay_apps.amount)
    FROM pay_apps
    WHERE pay_apps.project_id = e.id
  ), 0::numeric) AS balance
FROM engagements e
LEFT JOIN companies co ON e.company_id = co.id
LEFT JOIN stages s ON e.stage_id = s.id
WHERE e.type = 'project';

COMMENT ON VIEW project_dashboard IS 'Project dashboard view using engagements and companies tables';

-- Step 8: Update RLS policies that reference customers table
-- Drop old policies
DROP POLICY IF EXISTS "Users can view customers" ON public.companies;
DROP POLICY IF EXISTS "Users can insert customers" ON public.companies;
DROP POLICY IF EXISTS "Users can update customers" ON public.companies;
DROP POLICY IF EXISTS "Users can delete customers" ON public.companies;

-- Recreate policies with new names (assuming authenticated users can access)
CREATE POLICY "Users can view companies" ON public.companies
  FOR SELECT USING (true);

CREATE POLICY "Users can insert companies" ON public.companies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update companies" ON public.companies
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete companies" ON public.companies
  FOR DELETE USING (true);

-- Step 9: Add comments
COMMENT ON TABLE public.companies IS 'Companies table - includes Contractors (GCs/customers), Architects, and Owners';
COMMENT ON COLUMN public.companies.company_type IS 'Type of company: Contractor, Architect, or Owner';
COMMENT ON COLUMN public.companies.is_customer IS 'True if this company is a customer (typically Contractors). Architects and Owners are typically not customers.';

COMMIT;
