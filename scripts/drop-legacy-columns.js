// Drop legacy engagement party columns using service role key
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    '❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
  );
  console.log('Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file');
  console.log(
    'Get it from: Supabase Dashboard → Settings → API → service_role key'
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const dropSQL = `
-- Step 1: Drop dependent views
DROP VIEW IF EXISTS project_dashboard CASCADE;

-- Step 2: Drop legacy columns
ALTER TABLE public.engagements
  DROP COLUMN IF EXISTS company_id,
  DROP COLUMN IF EXISTS contact_id,
  DROP COLUMN IF EXISTS architect_id,
  DROP COLUMN IF EXISTS sales_contact_id,
  DROP COLUMN IF EXISTS project_manager_id;

-- Step 3: Recreate project_dashboard view using engagement_parties_detailed
CREATE OR REPLACE VIEW project_dashboard AS
SELECT 
  e.id,
  e.name AS project_name,
  e.qbid,
  e.project_number,
  customer.party_name as customer_name,
  pm.party_name as owner,
  e.owner as manager,
  e.probability,
  e.probability_percent,
  e.stage_id,
  s.name as stage_name,
  e.contract_amount as contract_amt,
  e.contract_amount as total_amt,
  e.start_date,
  e.end_date,
  e.est_start_date,
  e.notes,
  e.sharepoint_folder,
  e.created_at,
  e.updated_at
FROM engagements e
LEFT JOIN (
  SELECT engagement_id, party_name 
  FROM engagement_parties_detailed 
  WHERE role = 'customer' AND is_primary = true
) customer ON e.id = customer.engagement_id
LEFT JOIN (
  SELECT engagement_id, party_name 
  FROM engagement_parties_detailed 
  WHERE role = 'project_manager' AND is_primary = true
) pm ON e.id = pm.engagement_id
LEFT JOIN stages s ON e.stage_id = s.id
WHERE e.type = 'project'
ORDER BY e.updated_at DESC;

COMMENT ON VIEW project_dashboard IS 'Project dashboard using engagement_parties_detailed for party relationships';
`;

(async () => {
  console.log('🗑️  Dropping legacy engagement party columns...');
  console.log(`📍 Database: ${url}`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: dropSQL });

    if (error) {
      console.error('❌ Error executing DROP COLUMN:', error);
      process.exit(1);
    }

    console.log('✅ Columns dropped successfully!');
    console.log('Result:', data);
  } catch (err) {
    console.error('💥 Unexpected error:', err);
    process.exit(1);
  }
})();
