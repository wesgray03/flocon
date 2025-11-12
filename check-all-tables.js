// Check all critical tables and views for their actual columns
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hiimfqazsbqniqvowexo.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaW1mcWF6c2Jxbmlxdm93ZXhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTAxNTQzMiwiZXhwIjoyMDQ0NTkxNDMyfQ.z2vp4k1DgC6tOikbqMPCF2sGXXfmv35CL_ZcqS2w3uY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
  console.log(`\n=== ${tableName} ===`);
  const { data, error } = await supabase.from(tableName).select('*').limit(1);

  if (error) {
    console.error(`ERROR querying ${tableName}:`, error.message);
    return;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]).sort();
    console.log(`Columns (${columns.length}):`, columns.join(', '));
  } else {
    console.log('No data (table exists but empty)');
  }
}

async function checkAll() {
  console.log('Checking all critical tables and views...\n');

  // Core tables and views
  await checkTable('engagements');
  await checkTable('engagement_dashboard');
  await checkTable('engagement_parties');
  await checkTable('engagement_user_roles');
  await checkTable('engagement_tasks');
  await checkTable('engagement_task_completion');
  await checkTable('stages');
  await checkTable('users');
  await checkTable('contacts');
  await checkTable('companies');

  // Check if old tables still exist
  console.log('\n=== Checking for obsolete tables ===');
  await checkTable('projects');
  await checkTable('project_dashboard');
  await checkTable('project_contacts');
}

checkAll();
