// set-qbo-job-id.js
// Update project 1252 with QBO job ID 59

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setQBOJobId() {
  console.log('Setting QBO Job ID for project 1252...\n');

  // Update project 1252 with qbo_job_id = '59'
  const { data, error } = await supabase
    .from('engagements')
    .update({ qbo_job_id: '59' })
    .eq('project_number', '1252')
    .select();

  if (error) {
    console.error('Error updating project:', error);
    return;
  }

  console.log('✓ Updated project 1252 with qbo_job_id = 59');
  console.log('Updated project:', data);
}

setQBOJobId()
  .then(() => {
    console.log('\n✓ Update complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
