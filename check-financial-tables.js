// Check what financial tables exist
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  const tableNames = [
    'engagement_change_orders',
    'engagement_pay_apps',
    'engagement_billings',
    'engagement_financials',
    'change_orders',
    'pay_apps',
  ];

  for (const tableName of tableNames) {
    const { error } = await supabase.from(tableName).select('id').limit(1);

    console.log(`${tableName}: ${error ? 'DOES NOT EXIST' : 'EXISTS'}`);
  }
}

checkTables();
