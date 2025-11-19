// Check for sync errors on project 1290 pay apps
require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSyncErrors() {
  console.log('Checking sync errors for project 1290...\n');

  const { data: payApps } = await supabase
    .from('engagement_pay_apps')
    .select('*')
    .eq('engagement_id', 'd4525cc3-e756-4966-9c42-1b7e0ece9c66')
    .order('pay_app_number');

  if (!payApps || payApps.length === 0) {
    console.log('No pay apps found');
    return;
  }

  console.log(`Found ${payApps.length} pay apps:\n`);

  payApps.forEach((pa) => {
    console.log(`Pay App #${pa.pay_app_number}:`);
    console.log('  ID:', pa.id);
    console.log('  Amount:', pa.amount);
    console.log('  Current Payment Due:', pa.current_payment_due);
    console.log('  QB Invoice ID:', pa.qbo_invoice_id || 'None');
    console.log('  QB Sync Status:', pa.qbo_sync_status || 'null');
    console.log('  QB Sync Error:', pa.qbo_sync_error || 'null');
    console.log('  QB Synced At:', pa.qbo_synced_at || 'null');
    console.log('  Updated At:', pa.updated_at);
    console.log('');
  });
}

checkSyncErrors();
