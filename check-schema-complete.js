// Query all critical tables to get actual columns
const { createClient } = require('@supabase/supabase-js');

// Use staging environment
const supabase = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ'
);

async function checkTable(tableName) {
  const { data, error } = await supabase.from(tableName).select('*').limit(1);

  if (error) {
    console.log(`\n❌ ${tableName}: ${error.message}`);
    return null;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]).sort();
    console.log(`\n✅ ${tableName} (${columns.length} columns):`);
    console.log(`   ${columns.join(', ')}`);
    return columns;
  } else {
    console.log(`\n⚠️  ${tableName}: exists but empty`);
    return [];
  }
}

async function checkAll() {
  console.log('='.repeat(80));
  console.log('CHECKING ALL TABLES AND VIEWS');
  console.log('='.repeat(80));

  // Core tables and views
  console.log('\n--- CORE ENGAGEMENT TABLES ---');
  await checkTable('engagements');
  await checkTable('engagement_dashboard');

  console.log('\n--- JUNCTION TABLES ---');
  await checkTable('engagement_parties');
  await checkTable('engagement_user_roles');

  console.log('\n--- TASK TABLES ---');
  await checkTable('engagement_tasks');
  await checkTable('engagement_task_completion');

  console.log('\n--- REFERENCE TABLES ---');
  await checkTable('stages');
  await checkTable('users');
  await checkTable('contacts');
  await checkTable('companies');

  // Check if old tables still exist
  console.log('\n--- CHECKING FOR OBSOLETE TABLES ---');
  await checkTable('projects');
  await checkTable('project_dashboard');
  await checkTable('project_contacts');

  console.log('\n' + '='.repeat(80));
}

checkAll().catch(console.error);
