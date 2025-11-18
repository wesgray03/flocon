-- Create table to track which vendors should be imported from QuickBooks
-- This replaces the need for CSV files or QB custom fields

CREATE TABLE qbo_vendor_import_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX idx_qbo_vendor_import_list_name ON qbo_vendor_import_list(vendor_name);

-- Enable RLS
ALTER TABLE qbo_vendor_import_list ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read the list
CREATE POLICY "Allow authenticated users to read vendor import list"
  ON qbo_vendor_import_list
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to manage the list
CREATE POLICY "Allow authenticated users to manage vendor import list"
  ON qbo_vendor_import_list
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Populate with initial vendors from the CSV
INSERT INTO qbo_vendor_import_list (vendor_name) VALUES
  ('Kenneth L. Maxwell'),
  ('Mladen Jerkovic'),
  ('Trade Partners LLC'),
  ('Trent J. Mitchell'),
  ('Insurance Group of America'),
  ('PlanGrid'),
  ('RB Builders, Inc'),
  ('Matt White'),
  ('Maxwell Properties'),
  ('Bluebeam, Inc.'),
  ('360Training'),
  ('Lowe''s'),
  ('House Plans Unlimited'),
  ('Metro Water'),
  ('Piedmont Natural Gas'),
  ('Louisville Tile'),
  ('Mannington Mills Inc.'),
  ('Dal Tile'),
  ('LMG Tile Inc'),
  ('Tarkett'),
  ('Interface America''s Inc (Nora Systems)'),
  ('Specialty Tile Products, Inc.'),
  ('Wausau Tile'),
  ('Platform Surfaces LLC'),
  ('Building Plastics, Inc.'),
  ('Alley-Cassetty Brick & Stone'),
  ('Architectural & Design Solutions'),
  ('United Rentals'),
  ('Architessa'),
  ('Emser Tile'),
  ('Sunbelt Rentals, Inc.'),
  ('Trinity Surfaces'),
  ('Jeffco Flooring & Supply Inc.'),
  ('Construction Specialties, Inc.'),
  ('Tilebar'),
  ('Intelli-Force Technology Corp'),
  ('Milliken & Company'),
  ('Mohawk Factoring LLC'),
  ('Spartan Surfaces, Inc.'),
  ('Stone Source LLC'),
  ('NuSolutions Group LLC'),
  ('William M. Bird'),
  ('Mincey Bathroom Installations Inc.'),
  ('Sandy Neck Traders'),
  ('Logistics Solutions, LLC'),
  ('Floor and Decor Outlets of America Inc (DE)'),
  ('E.J. Welch Company'),
  ('Associated Imports Corporation'),
  ('The Tile Shop'),
  ('Olde Savannah'),
  ('Bedrosians Tile & Stone'),
  ('FLOR, Inc.'),
  ('Stonepeak Ceramics, Inc'),
  ('HD Supply White Cap'),
  ('Hoskin & Muir, Inc.'),
  ('Fishman Flooring Solutions'),
  ('Stoler Industries'),
  ('Mshower LLC'),
  ('F&W Transport, Inc.'),
  ('Oakley Lumber'),
  ('All Surfaces, Inc'),
  ('Robert F. Henry Tile Company'),
  ('LBLogistics'),
  ('Shaw Industries, Inc.');
