// Script to check engagements schema
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Checking engagements table structure...');

  // Get a sample engagement to see what columns exist
  const { data, error } = await supabase
    .from('engagements')
    .select('*')
    .eq('type', 'prospect')
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Sample engagement columns:');
    console.log(
      Object.keys(data || {})
        .sort()
        .join(', ')
    );

    if (data) {
      console.log('\nUser-related columns:');
      const userCols = Object.keys(data).filter((k) => k.includes('user'));
      userCols.forEach((col) => {
        console.log(`  ${col}: ${data[col]}`);
      });
    }
  }

  // Try different join approaches
  console.log('\n\nTesting different query approaches...');

  // Without the FK hint
  console.log('1. Without FK hint:');
  const { data: data1, error: error1 } = await supabase
    .from('engagements')
    .select('id, name, user_id, users(name)')
    .eq('type', 'prospect')
    .limit(1);

  if (error1) {
    console.error('   ❌ Error:', error1.message);
  } else {
    console.log('   ✅ Success!');
  }

  // With manual join
  console.log('2. Manual approach (get user separately):');
  const { data: data2, error: error2 } = await supabase
    .from('engagements')
    .select('*')
    .eq('type', 'prospect')
    .limit(1)
    .single();

  if (error2) {
    console.error('   ❌ Error:', error2.message);
  } else if (data2?.user_id) {
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', data2.user_id)
      .single();
    console.log('   ✅ Success! User name:', userData?.name);
  } else {
    console.log('   ✅ Success! (no user_id on engagement)');
  }
}

run();
