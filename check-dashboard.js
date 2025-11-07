const { createClient } = require('@supabase/supabase-js');

const stagingClient = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1ODQsImV4cCI6MjA3ODAzMTU4NH0.NDXes_vCvs9ocgJcc4BXqFXe68SUjRkBz_wEqvprLVo'
);

async function checkDashboard() {
  console.log('🔍 Checking project_dashboard view...\n');

  const { data, error } = await stagingClient
    .from('project_dashboard')
    .select('*')
    .limit(5);

  if (error) {
    console.log('❌ Error querying project_dashboard:', error.message);
  } else {
    console.log(`✅ Found ${data.length} rows in project_dashboard`);
    if (data.length > 0) {
      console.log('\nSample row:');
      console.log(data[0]);
    }
  }
}

checkDashboard();
