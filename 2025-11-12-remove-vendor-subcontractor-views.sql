-- Migration: Remove vendors_view and subcontractors_view
-- Date: 2025-11-12
-- Purpose: Simplify by querying companies table directly
-- Background: These views just filter companies table by is_vendor/is_subcontractor.
-- Direct queries are more flexible and consistent with how we query for customers.
-- We can recreate views later if complex JOINs become repetitive.

DROP VIEW IF EXISTS vendors_view CASCADE;
DROP VIEW IF EXISTS subcontractors_view CASCADE;

-- Note: Application code should now query directly:
-- SELECT * FROM companies WHERE is_vendor = true
-- SELECT * FROM companies WHERE is_subcontractor = true
-- JOIN company_vendor_details or company_subcontractor_details as needed
 