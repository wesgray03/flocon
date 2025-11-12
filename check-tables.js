// Check what tables exist
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  // Try to query from change_orders
  const { data: co, error: coError } = await supabase
    .from('change_orders')
    .select('id')
    .limit(1);

  console.log(
    'change_orders table:',
    coError ? `ERROR: ${coError.message}` : 'EXISTS'
  );

  // Try to query from pay_apps
  const { data: pa, error: paError } = await supabase
    .from('pay_apps')
    .select('id')
    .limit(1);

  console.log(
    'pay_apps table:',
    paError ? `ERROR: ${paError.message}` : 'EXISTS'
  );
}

checkTables();
