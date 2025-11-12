-- Migration: Rename customer_id to company_id in contacts table and add new contact types
-- Date: 2025-11-09
-- Purpose: Ensure all contacts are linked to a company

BEGIN;

-- Step 1: Rename customer_id to company_id (if it hasn't been renamed yet)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contacts' AND column_name = 'customer_id'
  ) THEN
    -- Drop the old foreign key constraint first
    ALTER TABLE public.contacts 
      DROP CONSTRAINT IF EXISTS contacts_customer_id_fkey;
    
    -- Rename the column
    ALTER TABLE public.contacts 
      RENAME COLUMN customer_id TO company_id;
    
    -- Add new foreign key constraint pointing to companies table
    ALTER TABLE public.contacts
      ADD CONSTRAINT contacts_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES public.companies(id);
    
    RAISE NOTICE 'Renamed customer_id to company_id in contacts table and updated foreign key';
  END IF;
END $$;

-- Step 2: Check for any existing contacts with NULL company_id
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count 
  FROM contacts 
  WHERE company_id IS NULL;
  
  IF orphan_count > 0 THEN
    RAISE NOTICE 'Warning: % contacts found with no company assigned', orphan_count;
    RAISE EXCEPTION 'Cannot make company_id NOT NULL. Please assign all contacts to companies first.';
  END IF;
END $$;

-- Step 3: Make company_id NOT NULL
ALTER TABLE public.contacts 
  ALTER COLUMN company_id SET NOT NULL;

-- Step 4: Update the contact_type check constraint to include new types
-- Drop the old constraint if it exists
ALTER TABLE public.contacts 
  DROP CONSTRAINT IF EXISTS contacts_contact_type_check;

-- Add updated constraint with all contact types
ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_contact_type_check 
  CHECK (contact_type IN (
    'Project Manager',
    'Superintendent', 
    'Estimator',
    'Accounting',
    'Owner',
    'Architect',
    'Sales',
    'Other'
  ));

COMMENT ON COLUMN public.contacts.company_id IS 'Required reference to companies table - every contact must belong to a company';
COMMENT ON COLUMN public.contacts.contact_type IS 'Type of contact: Project Manager, Superintendent, Estimator, Accounting, Owner, Architect, Sales, or Other';

COMMIT;
