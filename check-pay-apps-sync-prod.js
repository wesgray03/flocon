require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.production.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPayAppsSyncStatus() {
  console.log('Checking PRODUCTION pay apps QB sync status...\n');

  // Get all pay apps
  const { data: payApps, error: payAppsError } = await supabase
    .from('engagement_pay_apps')
    .select(
      'id, engagement_id, pay_app_number, description, qbo_invoice_id, qbo_sync_status, qbo_synced_at'
    )
    .order('engagement_id', { ascending: true })
    .order('pay_app_number', { ascending: true });

  if (payAppsError) {
    console.error('Error fetching pay apps:', payAppsError);
    return;
  }

  if (!payApps || payApps.length === 0) {
    console.log('No pay apps found in production.');
    return;
  }

  // Get engagement IDs
  const engagementIds = [...new Set(payApps.map((p) => p.engagement_id))];

  // Fetch engagements separately
  const { data: engagements, error: engagementsError } = await supabase
    .from('engagements')
    .select('id, project_number')
    .in('id', engagementIds);

  if (engagementsError) {
    console.error('Error fetching engagements:', engagementsError);
    return;
  }

  // Create a map for quick lookup
  const projectMap = new Map(engagements.map((e) => [e.id, e.project_number]));

  const synced = payApps.filter((p) => p.qbo_invoice_id);
  const unsynced = payApps.filter((p) => !p.qbo_invoice_id);

  console.log(`Found ${payApps.length} pay apps\n`);
  console.log(`✅ Synced: ${synced.length}`);
  console.log(`⚠️  Unsynced: ${unsynced.length}\n`);

  if (synced.length > 0) {
    console.log('SYNCED PAY APPS:');
    console.log('='.repeat(80));
    synced.forEach((p) => {
      const projectNumber = projectMap.get(p.engagement_id);
      console.log(`Project ${projectNumber} - Pay App #${p.pay_app_number}`);
      console.log(`  QB Invoice ID: ${p.qbo_invoice_id}`);
      console.log(`  Status: ${p.qbo_sync_status}`);
      console.log(`  Synced: ${new Date(p.qbo_synced_at).toLocaleString()}\n`);
    });
  }

  if (unsynced.length > 0) {
    console.log('\nUNSYNCED PAY APPS:');
    console.log('='.repeat(80));
    unsynced.forEach((p) => {
      const projectNumber = projectMap.get(p.engagement_id);
      console.log(`Project ${projectNumber} - Pay App #${p.pay_app_number}`);
      if (p.description) {
        console.log(`  Description: ${p.description}`);
      }
    });
  }
}

checkPayAppsSyncStatus();
