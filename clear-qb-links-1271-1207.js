// Clear QB links for projects 1271 and 1207
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearQBLinks() {
  console.log('Clearing QB links for projects 1271 and 1207...\n');

  const { data, error } = await supabase
    .from('engagements')
    .update({
      qbo_customer_id: null,
      qbo_job_id: null,
      qbo_last_synced_at: null,
    })
    .in('project_number', ['1271', '1207'])
    .select('id, project_number, name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`✅ Cleared QB links from ${data.length} projects:`);
  data.forEach((p) => {
    console.log(`   ${p.project_number} - ${p.name}`);
  });
}

clearQBLinks().catch(console.error);
