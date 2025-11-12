-- Migration: Add RLS policies for engagement_subcontractors table
-- Date: 2025-11-11
-- Purpose: Enable RLS and create policies for engagement_subcontractors table

-- Enable RLS on engagement_subcontractors
ALTER TABLE public.engagement_subcontractors ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view all engagement subcontractors
CREATE POLICY "Allow authenticated users to view engagement subcontractors"
  ON public.engagement_subcontractors
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert engagement subcontractors
CREATE POLICY "Allow authenticated users to insert engagement subcontractors"
  ON public.engagement_subcontractors
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update engagement subcontractors
CREATE POLICY "Allow authenticated users to update engagement subcontractors"
  ON public.engagement_subcontractors
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to delete engagement subcontractors
CREATE POLICY "Allow authenticated users to delete engagement subcontractors"
  ON public.engagement_subcontractors
  FOR DELETE
  TO authenticated
  USING (true);

-- Enable RLS on company extension tables
ALTER TABLE public.company_vendor_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_subcontractor_details ENABLE ROW LEVEL SECURITY;

-- Policies for company_vendor_details
CREATE POLICY "Allow authenticated users to view vendor details"
  ON public.company_vendor_details
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage vendor details"
  ON public.company_vendor_details
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for company_subcontractor_details
CREATE POLICY "Allow authenticated users to view subcontractor details"
  ON public.company_subcontractor_details
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage subcontractor details"
  ON public.company_subcontractor_details
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
