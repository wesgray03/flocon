require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSyncErrors() {
  console.log('Checking for sync errors in production...\n');

  const { data: payApps, error } = await supabase
    .from('engagement_pay_apps')
    .select(
      'id, pay_app_number, engagement_id, qbo_sync_status, qbo_sync_error, qbo_synced_at'
    )
    .order('qbo_synced_at', { ascending: false, nullsFirst: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Get engagement IDs for project numbers
  const engagementIds = [...new Set(payApps.map((p) => p.engagement_id))];
  const { data: engagements } = await supabase
    .from('engagements')
    .select('id, project_number')
    .in('id', engagementIds);

  const projectMap = new Map(
    engagements?.map((e) => [e.id, e.project_number]) || []
  );

  console.log('Recent Pay App Sync Attempts:\n');
  console.log('='.repeat(80));

  payApps.forEach((pa) => {
    const projectNumber = projectMap.get(pa.engagement_id);
    console.log(`Project ${projectNumber} - Pay App #${pa.pay_app_number}`);
    console.log(`  Status: ${pa.qbo_sync_status || 'not synced'}`);
    if (pa.qbo_sync_error) {
      console.log(`  ❌ ERROR: ${pa.qbo_sync_error}`);
    }
    if (pa.qbo_synced_at) {
      console.log(
        `  Last attempt: ${new Date(pa.qbo_synced_at).toLocaleString()}`
      );
    }
    console.log();
  });

  // Count by status
  const statusCounts = {};
  payApps.forEach((pa) => {
    const status = pa.qbo_sync_status || 'not synced';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  console.log('\nStatus Summary:');
  console.log('='.repeat(80));
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`${status}: ${count}`);
  });
}

checkSyncErrors();
