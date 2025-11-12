// apply-probability-migration.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw'
);

async function applyMigration() {
  console.log('Applying probability_level_id migration...\n');

  try {
    // Check if column already exists
    const { data: columns, error: checkError } = await supabase
      .from('engagements')
      .select('probability_level_id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Column probability_level_id already exists!');
      return;
    }

    console.log('Column does not exist, adding it now...');

    // Add the column using raw SQL through a function or direct query
    // Since we can't use exec_sql RPC, we'll need to use Supabase dashboard
    console.log('\n⚠️  Please run this SQL in Supabase SQL Editor:');
    console.log('---------------------------------------------------');
    console.log(`
-- Drop old probability fields
ALTER TABLE engagements 
DROP COLUMN IF EXISTS probability CASCADE;

ALTER TABLE engagements 
DROP COLUMN IF EXISTS probability_percent CASCADE;

-- Add probability_level_id foreign key column
ALTER TABLE engagements 
ADD COLUMN IF NOT EXISTS probability_level_id UUID 
REFERENCES probability_levels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_engagements_probability_level_id 
ON engagements(probability_level_id);

COMMENT ON COLUMN engagements.probability_level_id 
IS 'FK to probability_levels table - standardized probability level for prospects';
    `);
    console.log('---------------------------------------------------');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

applyMigration();
