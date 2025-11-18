// Check companies QB sync status
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCompanies() {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, qbo_id, qbo_last_synced_at')
    .order('name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total Companies: ${companies.length}\n`);

  const synced = companies.filter((c) => c.qbo_id);
  const notSynced = companies.filter((c) => !c.qbo_id);

  console.log(`Synced: ${synced.length}`);
  console.log(`Not Synced: ${notSynced.length}\n`);

  if (synced.length > 0) {
    console.log('Synced Companies:');
    synced.forEach((c) => {
      console.log(`  - ${c.name} (QB ID: ${c.qbo_id})`);
    });
  }
}

checkCompanies();
