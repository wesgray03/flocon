// Find similar company variations
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findSimilar() {
  const { data } = await supabase
    .from('companies')
    .select('id, name, qbo_id')
    .ilike('name', '%aagaard%')
    .order('name');

  console.log('Aagaard companies:');
  data.forEach(c => console.log(`  ${c.name} - QB: ${c.qbo_id || 'none'}`));
}

findSimilar().catch(console.error);
