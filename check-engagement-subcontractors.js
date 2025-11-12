// Check engagement_subcontractors table structure
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTable() {
  console.log('Checking engagement_subcontractors table...\n');

  // Try to select from the table
  const { data, error } = await supabase
    .from('engagement_subcontractors')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Table exists!');
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]).join(', '));
      console.log('\nSample record:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('No records found in table');
    }
  }

  process.exit(0);
}

checkTable();
