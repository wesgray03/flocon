/**
 * Clear all QB sync data from projects
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function clearSync() {
  console.log('Clearing QuickBooks sync data from all projects...\n');

  const { data, error } = await supabase
    .from('engagements')
    .update({
      qbo_customer_id: null,
      qbo_job_id: null,
      qbo_last_synced_at: null,
    })
    .eq('type', 'project')
    .select('id, project_number, name');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`✅ Cleared QB sync data from ${data.length} projects\n`);

  data.forEach((project) => {
    console.log(`  ✓ ${project.project_number} - ${project.name}`);
  });

  console.log('\nReady to re-sync. Run: node test-bulk-sync.js');
}

clearSync();
