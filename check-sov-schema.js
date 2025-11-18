require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSOVSchema() {
  const sql = `
    SELECT column_name, data_type, numeric_precision, numeric_scale
    FROM information_schema.columns 
    WHERE table_name = 'engagement_sov_lines'
    AND column_name IN ('unit_cost', 'extended_cost', 'quantity')
    ORDER BY column_name;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('SOV Line columns:');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkSOVSchema();
