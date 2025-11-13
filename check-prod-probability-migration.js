// Verify probability_level_id migration on PRODUCTION
const { createClient } = require('@supabase/supabase-js');

// Hardcoded to production, like check-thin-views.js
const url = 'https://groxqyaoavmfvmaymhbe.supabase.co';
const key =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw';

const supabase = createClient(url, key);

(async () => {
  console.log('🔎 Checking production engagements columns...');
  const res1 = await supabase
    .from('engagements')
    .select('id, last_call, active, probability_level_id')
    .limit(1);
  if (res1.error) {
    console.log('❌ Selecting new columns failed:', res1.error.message);
  } else {
    console.log('✅ New columns present (sample):', res1.data);
  }

  console.log('\n🔎 Checking if old columns still exist (should fail)...');
  const res2 = await supabase
    .from('engagements')
    .select('id, probability, probability_percent')
    .limit(1);
  if (res2.error) {
    console.log('✅ Old columns removed:', res2.error.message);
  } else {
    console.log('⚠️ Old columns still selectable (unexpected):', res2.data);
  }
})();
