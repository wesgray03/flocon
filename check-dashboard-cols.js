// Query engagement_dashboard view to get actual columns
const { createClient } = require('@supabase/supabase-js');

// Use staging environment
const supabase = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ'
);

async function checkSchema() {
  console.log('Checking engagement_dashboard schema...\n');

  // Method 1: Get sample data to see columns
  const { data, error } = await supabase
    .from('engagement_dashboard')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error querying engagement_dashboard:', error.message);
    return;
  }

  if (data && data.length > 0) {
    const cols = Object.keys(data[0]);
    console.log('engagement_dashboard columns:');
    cols.forEach((col) => console.log(`  - ${col}`));

    console.log('\nSample data types:');
    Object.entries(data[0]).forEach(([key, value]) => {
      console.log(
        `  ${key}: ${typeof value} ${value === null ? '(null)' : ''}`
      );
    });
  } else {
    console.log('No data in engagement_dashboard');
  }
}

checkSchema().catch(console.error);
