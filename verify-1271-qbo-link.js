// Verify project 1271 QB connection
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyProject() {
  console.log('Checking project 1271 in database...\n');

  const { data, error } = await supabase
    .from('engagements')
    .select(
      'id, project_number, name, qbo_customer_id, qbo_job_id, qbo_last_synced_at'
    )
    .eq('project_number', '1271')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Project 1271:');
  console.log(`  Name: ${data.name}`);
  console.log(`  QB Customer ID: ${data.qbo_customer_id || 'NOT SET'}`);
  console.log(`  QB Job ID: ${data.qbo_job_id || 'NOT SET'}`);
  console.log(`  Last Synced: ${data.qbo_last_synced_at || 'NEVER'}`);

  if (data.qbo_job_id) {
    console.log(`\n✅ Project is linked to QB Job ID: ${data.qbo_job_id}`);
    console.log('Go to QuickBooks and verify this is the correct project.');
  } else {
    console.log('\n⚠️  Project is not linked to QuickBooks yet.');
  }
}

verifyProject().catch(console.error);
