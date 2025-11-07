const { createClient } = require('@supabase/supabase-js');

// Try with anon key first
const stagingClientAnon = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1ODQsImV4cCI6MjA3ODAzMTU4NH0.NDXes_vCvs9ocgJcc4BXqFXe68SUjRkBz_wEqvprLVo'
);

// Try with service role key
const stagingClientService = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ'
);

async function verifyStaging() {
  console.log('🔍 Verifying staging database...\n');

  // Check with service role key
  console.log('📋 Checking with SERVICE ROLE key (bypasses RLS):');
  const { data: projectsService, error: serviceError } =
    await stagingClientService
      .from('projects')
      .select('id, name, qbid')
      .limit(10);

  if (serviceError) {
    console.log('❌ Error with service key:', serviceError.message);
  } else {
    console.log(`✅ Found ${projectsService.length} projects with service key`);
    projectsService.slice(0, 5).forEach((p) => {
      console.log(`   - ${p.name || 'Unnamed'} (${p.qbid || 'no qbid'})`);
    });
  }

  // Check with anon key (what your app uses)
  console.log('\n📋 Checking with ANON key (what your app uses):');
  const { data: projectsAnon, error: anonError } = await stagingClientAnon
    .from('projects')
    .select('id, name, qbid')
    .limit(10);

  if (anonError) {
    console.log('❌ Error with anon key:', anonError.message);
    console.log(
      '\n🔒 RLS ISSUE: The anon key cannot read data due to RLS policies!'
    );
    console.log(
      "💡 The policies require auth.role() = 'authenticated' but anon is unauthenticated"
    );
  } else {
    console.log(`✅ Found ${projectsAnon.length} projects with anon key`);
    if (projectsAnon.length === 0) {
      console.log(
        '\n⚠️  Data exists but anon key returns 0 results - RLS policy issue!'
      );
    }
  }
}

verifyStaging();
