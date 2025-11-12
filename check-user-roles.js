// Query engagement_user_roles to see what roles are actually allowed
const { createClient } = require('@supabase/supabase-js');

// Use staging environment
const supabase = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ'
);

async function checkUserRoles() {
  console.log('Checking engagement_user_roles for existing role values...\n');

  const { data, error } = await supabase
    .from('engagement_user_roles')
    .select('role')
    .limit(100);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (data && data.length > 0) {
    const uniqueRoles = [...new Set(data.map((r) => r.role))].sort();
    console.log('Unique roles found in engagement_user_roles:');
    uniqueRoles.forEach((role) => console.log(`  - ${role}`));
  } else {
    console.log('No data in engagement_user_roles table');
  }
}

checkUserRoles().catch(console.error);
