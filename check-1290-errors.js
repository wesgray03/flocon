require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentErrors() {
  console.log('Checking for ANY errors with timestamps...\n');

  const { data: payApps } = await supabase
    .from('engagement_pay_apps')
    .select('id, pay_app_number, engagement_id, qbo_sync_status, qbo_sync_error, qbo_synced_at, updated_at')
    .eq('engagement_id', 'd4525cc3-e756-4966-9c42-1b7e0ece9c66') // Project 1290
    .order('pay_app_number', { ascending: true });

  console.log('Project 1290 pay apps:\n');
  payApps.forEach(pa => {
    console.log(`Pay App #${pa.pay_app_number}`);
    console.log(`  Status: ${pa.qbo_sync_status || 'null'}`);
    console.log(`  Error: ${pa.qbo_sync_error || 'null'}`);
    console.log(`  Synced At: ${pa.qbo_synced_at || 'null'}`);
    console.log(`  Updated At: ${pa.updated_at}`);
    console.log();
  });
}

checkRecentErrors();
