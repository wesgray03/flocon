#!/usr/bin/env node
// Check which projects have been synced to QuickBooks
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSyncedProjects() {
  console.log('🔍 Checking synced projects...\n');

  const { data: projects, error } = await supabase
    .from('engagements')
    .select(
      'id, name, project_number, qbo_customer_id, qbo_job_id, qbo_last_synced_at'
    )
    .eq('type', 'project')
    .not('qbo_job_id', 'is', null)
    .order('qbo_last_synced_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!projects || projects.length === 0) {
    console.log('⚪ No projects have been synced yet');
    return;
  }

  console.log(`✅ Found ${projects.length} synced project(s):\n`);

  for (const p of projects) {
    console.log(`📋 ${p.name} (${p.project_number})`);
    console.log(`   QB Customer ID: ${p.qbo_customer_id}`);
    console.log(`   QB Job ID: ${p.qbo_job_id}`);
    console.log(`   Last Synced: ${p.qbo_last_synced_at}`);
    console.log('');
  }
}

checkSyncedProjects().catch(console.error);
