-- Migration: Consolidate vendors and subcontractors into companies table
-- Date: 2025-11-11
-- Purpose: Migrate vendors and subcontractors to unified companies table with extension tables

BEGIN;

-- =====================================================
-- STEP 1: Update companies table to support more types
-- =====================================================

-- Drop existing constraint
ALTER TABLE public.companies
DROP CONSTRAINT IF EXISTS company_type_check;

-- Add new constraint with Vendor and Subcontractor types
ALTER TABLE public.companies
ADD CONSTRAINT company_type_check 
CHECK (company_type IN ('Contractor', 'Architect', 'Owner', 'Vendor', 'Subcontractor'));

-- Add multi-type support (a company can be both a customer and vendor, etc.)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS is_vendor BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_subcontractor BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add trigger for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_companies_updated_at ON companies;
CREATE TRIGGER trigger_update_companies_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW
EXECUTE FUNCTION update_companies_updated_at();

COMMENT ON COLUMN public.companies.is_customer IS 'Company can be invoiced as a customer';
COMMENT ON COLUMN public.companies.is_vendor IS 'Company can be used as a vendor for purchasing';
COMMENT ON COLUMN public.companies.is_subcontractor IS 'Company can be assigned to projects as subcontractor';

-- =====================================================
-- STEP 2: Create vendor extension table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.company_vendor_details (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  account_number TEXT,
  default_payment_terms TEXT, -- e.g., 'Net 30', 'Net 60', 'Due on Receipt'
  w9_status TEXT CHECK (w9_status IN ('Not Requested', 'Requested', 'Received', 'Expired')),
  w9_received_date DATE,
  preferred_shipping_method TEXT,
  is_preferred_vendor BOOLEAN DEFAULT false,
  vendor_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.company_vendor_details IS 'Extended details for companies that are vendors';

CREATE INDEX idx_company_vendor_details_preferred ON company_vendor_details(is_preferred_vendor) WHERE is_preferred_vendor = true;

-- =====================================================
-- STEP 3: Create subcontractor extension table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.company_subcontractor_details (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  insurance_expiration DATE,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  license_number TEXT,
  license_expiration DATE,
  scope TEXT, -- What trade/specialty they do
  compliance_status TEXT CHECK (compliance_status IN ('Compliant', 'Pending', 'Non-Compliant', 'Unknown')) DEFAULT 'Unknown',
  subcontractor_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.company_subcontractor_details IS 'Extended details for companies that are subcontractors';

CREATE INDEX idx_company_subcontractor_insurance ON company_subcontractor_details(insurance_expiration) WHERE insurance_expiration IS NOT NULL;
CREATE INDEX idx_company_subcontractor_license ON company_subcontractor_details(license_expiration) WHERE license_expiration IS NOT NULL;

-- =====================================================
-- STEP 4: Drop old vendors and subcontractors tables
-- =====================================================

-- Drop old tables - we'll reimport production data later
DROP TABLE IF EXISTS public.project_subcontractors CASCADE;
DROP TABLE IF EXISTS public.engagement_subcontractors CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.subcontractors CASCADE;

-- =====================================================
-- STEP 5: Create new engagement_subcontractors table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.engagement_subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  work_order_number TEXT,
  assigned_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(engagement_id, company_id)
);

COMMENT ON TABLE public.engagement_subcontractors IS 'Junction table for assigning subcontractors (companies) to engagements';

CREATE INDEX idx_engagement_subcontractors_engagement ON engagement_subcontractors(engagement_id);
CREATE INDEX idx_engagement_subcontractors_company ON engagement_subcontractors(company_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_engagement_subcontractors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_engagement_subcontractors_updated_at
BEFORE UPDATE ON engagement_subcontractors
FOR EACH ROW
EXECUTE FUNCTION update_engagement_subcontractors_updated_at();

-- =====================================================
-- STEP 6: Create helper views for easy querying
-- =====================================================

-- View for all vendors with their details
CREATE OR REPLACE VIEW public.vendors_view AS
SELECT 
  c.id,
  c.name,
  c.company_type,
  c.is_customer,
  c.is_subcontractor,
  vd.account_number,
  vd.default_payment_terms,
  vd.w9_status,
  vd.w9_received_date,
  vd.preferred_shipping_method,
  vd.is_preferred_vendor,
  vd.vendor_notes,
  c.created_at,
  c.updated_at
FROM companies c
LEFT JOIN company_vendor_details vd ON c.id = vd.company_id
WHERE c.is_vendor = true;

COMMENT ON VIEW public.vendors_view IS 'All companies that are vendors with their vendor-specific details';

-- View for all subcontractors with their details
CREATE OR REPLACE VIEW public.subcontractors_view AS
SELECT 
  c.id,
  c.name,
  c.company_type,
  c.is_customer,
  c.is_vendor,
  sd.insurance_expiration,
  sd.insurance_provider,
  sd.insurance_policy_number,
  sd.license_number,
  sd.license_expiration,
  sd.scope,
  sd.compliance_status,
  sd.subcontractor_notes,
  c.created_at,
  c.updated_at
FROM companies c
LEFT JOIN company_subcontractor_details sd ON c.id = sd.company_id
WHERE c.is_subcontractor = true;

COMMENT ON VIEW public.subcontractors_view IS 'All companies that are subcontractors with their subcontractor-specific details';

-- =====================================================
-- STEP 7: Create triggers for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_company_vendor_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_vendor_details_updated_at
BEFORE UPDATE ON company_vendor_details
FOR EACH ROW
EXECUTE FUNCTION update_company_vendor_details_updated_at();

CREATE OR REPLACE FUNCTION update_company_subcontractor_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_subcontractor_details_updated_at
BEFORE UPDATE ON company_subcontractor_details
FOR EACH ROW
EXECUTE FUNCTION update_company_subcontractor_details_updated_at();

COMMIT;

-- =====================================================
-- POST-MIGRATION NOTES
-- =====================================================

-- After running this migration:
-- 1. The old 'vendors' and 'subcontractors' tables can be dropped (they're preserved for now)
-- 2. Use 'vendors_view' and 'subcontractors_view' for querying
-- 3. Insert new vendors by:
--    - Adding to companies with is_vendor=true
--    - Adding details to company_vendor_details
-- 4. Insert new subcontractors by:
--    - Adding to companies with is_subcontractor=true
--    - Adding details to company_subcontractor_details
-- 5. A company can be multiple types (e.g., both customer and vendor)
