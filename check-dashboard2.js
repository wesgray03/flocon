const { createClient } = require('@supabase/supabase-js');

const stagingClient = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1ODQsImV4cCI6MjA3ODAzMTU4NH0.NDXes_vCvs9ocgJcc4BXqFXe68SUjRkBz_wEqvprLVo'
);

async function checkDashboard() {
  console.log(
    '🔍 Checking project_dashboard view (what your app queries)...\n'
  );

  // First try without the stages join (the view already has stage info)
  console.log('1️⃣ Testing simple query (no join):');
  const { data: simpleData, error: simpleError } = await stagingClient
    .from('project_dashboard')
    .select('*')
    .limit(3);

  if (simpleError) {
    console.log('❌ Error:', simpleError.message);
  } else {
    console.log(`✅ Found ${simpleData.length} projects`);
    if (simpleData.length > 0) {
      console.log('First project:', simpleData[0]);
    }
  }

  // Now try with the stages join (like your app does)
  console.log('\n2️⃣ Testing with stages join (like your app):');
  const { data, error } = await stagingClient
    .from('project_dashboard')
    .select('*, stages(id,name,order)');

  if (error) {
    console.log('❌ Error with join:', error.message);
    console.log(
      '💡 The view already includes stage info, so the join may not be needed'
    );
  } else {
    console.log(`✅ Found ${data.length} projects with join`);
  }
}

checkDashboard();
