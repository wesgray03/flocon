/**
 * Check sync status of all projects
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAllProjects() {
  console.log('Checking sync status of all projects...\n');

  const { data: projects, error } = await supabase
    .from('engagements')
    .select(
      'id, project_number, name, qbo_customer_id, qbo_job_id, qbo_last_synced_at'
    )
    .eq('type', 'project')
    .order('project_number');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  const synced = projects.filter((p) => p.qbo_job_id);
  const unsynced = projects.filter((p) => !p.qbo_job_id);

  console.log(`Total Projects: ${projects.length}`);
  console.log(`Synced: ${synced.length}`);
  console.log(`Not Synced: ${unsynced.length}\n`);

  if (unsynced.length > 0) {
    console.log('Projects NOT synced:');
    console.log('─────────────────────────────────────────');
    unsynced.forEach((p) => {
      console.log(`  ${p.project_number || 'No #'} - ${p.name}`);
    });
    console.log();
  }

  if (synced.length > 0) {
    console.log('Recently synced projects:');
    console.log('─────────────────────────────────────────');
    synced
      .sort(
        (a, b) =>
          new Date(b.qbo_last_synced_at) - new Date(a.qbo_last_synced_at)
      )
      .slice(0, 5)
      .forEach((p) => {
        const time = new Date(p.qbo_last_synced_at).toLocaleTimeString();
        console.log(`  ${p.project_number} - ${p.name}`);
        console.log(`    QB Job ID: ${p.qbo_job_id}, Synced at: ${time}`);
      });
  }
}

checkAllProjects();
