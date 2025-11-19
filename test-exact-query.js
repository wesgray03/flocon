// Test the exact Supabase query that sync-billing uses
require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testExactQuery() {
  const projectId = 'd4525cc3-e756-4966-9c42-1b7e0ece9c66'; // Project 1290
  
  console.log('=== Testing exact query from sync-billing API ===');
  console.log('Project ID:', projectId);
  console.log('Project ID type:', typeof projectId);
  console.log('');
  
  console.log('Executing query...');
  const { data: payApps, error: payAppsError } = await supabase
    .from('engagement_pay_apps')
    .select('id')
    .eq('engagement_id', projectId)
    .order('pay_app_number');
  
  console.log('Query completed');
  console.log('Error:', payAppsError);
  console.log('Pay apps:', payApps);
  console.log('Count:', payApps?.length || 0);
  console.log('');
  
  if (payApps && payApps.length > 0) {
    console.log('✅ Query found pay apps!');
    payApps.forEach((pa, idx) => {
      console.log(`  ${idx + 1}. ID: ${pa.id}`);
    });
  } else {
    console.log('❌ Query returned no pay apps');
    console.log('');
    console.log('Testing alternative query without select...');
    const { data: alt, error: altError } = await supabase
      .from('engagement_pay_apps')
      .select('*')
      .eq('engagement_id', projectId);
    console.log('Alt query error:', altError);
    console.log('Alt query count:', alt?.length || 0);
  }
}

testExactQuery();
