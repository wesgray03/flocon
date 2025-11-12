// Query engagement_dashboard view to get actual columns
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking engagement_dashboard schema...\n');

  const { data, error } = await supabase
    .from('engagement_dashboard')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error querying engagement_dashboard:', error.message);
    return;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log('engagement_dashboard columns:');
    console.log(JSON.stringify(columns, null, 2));
    console.log('\nSample row:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('No data in engagement_dashboard');
  }
}

checkSchema().catch(console.error);
