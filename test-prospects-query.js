// Script to test the prospects query directly
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Testing prospects query...');

  const { data, error } = await supabase
    .from('engagements')
    .select(
      `
      *,
      users!engagements_user_id_fkey (name),
      engagement_trades (
        trade_id,
        estimated_amount,
        trade:trades ( code, name )
      )
    `
    )
    .eq('type', 'prospect')
    .order('name', { ascending: true });

  if (error) {
    console.error('❌ Query Error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log(`✅ Query successful! Found ${data?.length || 0} prospects`);
    if (data && data.length > 0) {
      console.log('\nFirst prospect:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  }
}

run();
