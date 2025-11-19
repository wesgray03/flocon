require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Import the sync function directly
async function testDirectSync() {
  console.log('Testing direct invoice sync for project 1292...\n');

  // Get the first pay app for project 1292
  const { data: engagement } = await supabase
    .from('engagements')
    .select('id')
    .eq('project_number', '1292')
    .single();

  if (!engagement) {
    console.log('Project not found');
    return;
  }

  const { data: payApps } = await supabase
    .from('engagement_pay_apps')
    .select('id, pay_app_number')
    .eq('engagement_id', engagement.id)
    .order('pay_app_number', { ascending: true })
    .limit(1);

  if (!payApps || payApps.length === 0) {
    console.log('No pay apps found');
    return;
  }

  const payApp = payApps[0];
  console.log(`Testing sync for Pay App #${payApp.pay_app_number}`);
  console.log(`Pay App ID: ${payApp.id}`);
  console.log();

  // Import and call the sync function
  const { syncPayAppToQBO } = require('./src/lib/qboInvoiceSync.ts');

  console.log('Calling syncPayAppToQBO...\n');
  const result = await syncPayAppToQBO(payApp.id);

  console.log('Result:', JSON.stringify(result, null, 2));
}

testDirectSync().catch(console.error);
