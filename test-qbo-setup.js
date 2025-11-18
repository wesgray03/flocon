#!/usr/bin/env node
// Test script to verify QuickBooks API connection and sync
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testQBOSetup() {
  console.log('🔍 Testing QuickBooks Setup...\n');

  // 1. Check if QB tokens table exists and has data
  console.log('1. Checking qbo_tokens table...');
  const { data: tokens, error: tokensError } = await supabase
    .from('qbo_tokens')
    .select('*')
    .eq('is_active', true);

  if (tokensError) {
    console.error('❌ Error reading qbo_tokens:', tokensError.message);
    return;
  }

  if (!tokens || tokens.length === 0) {
    console.log('❌ No active QuickBooks connection found');
    console.log('   Go to /settings and click "Connect to QuickBooks"\n');
    return;
  }

  console.log('✅ QuickBooks connected');
  console.log(`   Realm ID: ${tokens[0].realm_id}`);
  console.log(`   Connected: ${tokens[0].connected_at}`);
  console.log(`   Last Refreshed: ${tokens[0].last_refreshed_at || 'N/A'}\n`);

  // 2. Check if QB ID columns exist on engagements
  console.log('2. Checking engagements table columns...');
  const { data: engagements, error: engError } = await supabase
    .from('engagements')
    .select(
      'id, name, project_number, qbo_customer_id, qbo_job_id, qbo_last_synced_at'
    )
    .eq('type', 'project')
    .limit(1);

  if (engError) {
    console.error('❌ Error:', engError.message);
    console.log('   Run the migration: 2025-11-17-add-qbo-id-columns.sql\n');
    return;
  }

  console.log('✅ QB columns exist on engagements table\n');

  // 3. Check engagement_parties table
  console.log('3. Checking engagement_parties table...');
  const { data: parties, error: partiesError } = await supabase
    .from('engagement_parties')
    .select('*')
    .eq('role', 'customer')
    .eq('is_primary', true)
    .limit(1);

  if (partiesError) {
    console.error('❌ Error:', partiesError.message);
    return;
  }

  console.log('✅ engagement_parties table exists\n');

  // 4. Find projects that can be synced
  console.log('4. Finding projects ready to sync...');
  const { data: projects, error: projError } = await supabase
    .from('engagements')
    .select('id, name, project_number, qbo_customer_id, qbo_job_id')
    .eq('type', 'project')
    .not('project_number', 'is', null)
    .limit(10);

  if (projError) {
    console.error('❌ Error:', projError.message);
    return;
  }

  if (!projects || projects.length === 0) {
    console.log('❌ No projects with project_number found');
    console.log('   Projects need a project_number before syncing\n');
    return;
  }

  console.log(`✅ Found ${projects.length} projects with project_number:\n`);

  // Check which have customers
  for (const p of projects) {
    // Get customer party
    const { data: party } = await supabase
      .from('engagement_parties')
      .select('party_id, party_type')
      .eq('engagement_id', p.id)
      .eq('role', 'customer')
      .eq('is_primary', true)
      .maybeSingle();

    let customerName = null;
    if (party && party.party_type === 'company') {
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', party.party_id)
        .maybeSingle();
      customerName = company?.name;
    }

    const syncStatus = p.qbo_job_id ? '✅ Synced' : '⚪ Not synced';
    const customerStatus = customerName
      ? `👤 ${customerName}`
      : '❌ NO CUSTOMER';

    console.log(`   ${syncStatus} ${p.name} (${p.project_number})`);
    console.log(`      ${customerStatus}`);
    if (p.qbo_job_id) {
      console.log(`      QB Job ID: ${p.qbo_job_id}`);
    }
    console.log('');
  }

  console.log('\n📋 To Fix "No Customer" Error:');
  console.log('   1. Go to the project detail page');
  console.log('   2. Edit the project and assign a customer company');
  console.log('   3. Or add customer via SQL:');
  console.log(
    `      INSERT INTO engagement_parties (engagement_id, party_type, party_id, role, is_primary)`
  );
  console.log(
    `      VALUES ('project-id', 'company', 'company-id', 'customer', true);`
  );
  console.log('');
  console.log('📋 Next Steps:');
  console.log('   1. Assign customers to projects that need them');
  console.log('   2. Click "Sync to QuickBooks" button on project page\n');
}

testQBOSetup().catch(console.error);
