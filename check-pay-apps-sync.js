#!/usr/bin/env node
/**
 * Check if pay apps have QB invoice IDs linked
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPayApps() {
  console.log('Checking pay apps QB sync status...\n');

  // Get all pay apps with their QB sync info
  const { data: payApps, error } = await supabase
    .from('engagement_pay_apps')
    .select('*')
    .order('engagement_id')
    .order('pay_app_number');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  // Get project numbers separately
  const engagementIds = [...new Set(payApps.map((p) => p.engagement_id))];
  const { data: engagements } = await supabase
    .from('engagements')
    .select('id, project_number')
    .in('id', engagementIds);

  const projectMap = new Map(
    engagements?.map((e) => [e.id, e.project_number]) || []
  );

  console.log(`Found ${payApps.length} pay apps\n`);

  const synced = payApps.filter((p) => p.qbo_invoice_id);
  const unsynced = payApps.filter((p) => !p.qbo_invoice_id);

  console.log(`✅ Synced: ${synced.length}`);
  console.log(`⚠️  Unsynced: ${unsynced.length}\n`);

  if (synced.length > 0) {
    console.log('SYNCED PAY APPS:');
    console.log('='.repeat(80));
    synced.forEach((p) => {
      const projectNum = projectMap.get(p.engagement_id) || 'Unknown';
      console.log(
        `Project ${projectNum} - Pay App #${p.pay_app_number || 'N/A'}`
      );
      console.log(`  QB Invoice ID: ${p.qbo_invoice_id}`);
      console.log(`  Status: ${p.qbo_sync_status || 'N/A'}`);
      console.log(
        `  Synced: ${p.qbo_synced_at ? new Date(p.qbo_synced_at).toLocaleString() : 'N/A'}`
      );
      console.log();
    });
  }

  if (unsynced.length > 0) {
    console.log('\nUNSYNCED PAY APPS:');
    console.log('='.repeat(80));
    unsynced.forEach((p) => {
      const projectNum = projectMap.get(p.engagement_id) || 'Unknown';
      console.log(
        `Project ${projectNum} - Pay App #${p.pay_app_number || 'N/A'}`
      );
      console.log(`  Description: ${p.description}`);
      console.log();
    });
  }
}

checkPayApps().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
