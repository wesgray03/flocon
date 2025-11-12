require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkProjectsManagers() {
  console.log('Checking projects table structure and data...\n');
  
  // Get sample projects
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (projects && projects.length > 0) {
    console.log('Sample project columns:', Object.keys(projects[0]));
    console.log('\nFirst 3 projects:');
    projects.slice(0, 3).forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.name || p.project_name || 'N/A'}`);
      console.log(`   Manager field: ${p.manager || p.project_manager || p.manager_id || 'N/A'}`);
      console.log(`   Customer: ${p.customer || p.customer_name || p.customer_id || 'N/A'}`);
    });
  }
  
  // Check contacts with Project Manager type
  console.log('\n\n=== Project Managers in Contacts Table ===\n');
  const { data: pms, error: pmError } = await supabase
    .from('contacts')
    .select('*')
    .eq('contact_type', 'Project Manager')
    .order('name');
  
  if (pmError) {
    console.error('PM Error:', pmError);
    return;
  }
  
  console.log(`Total Project Managers in contacts: ${pms?.length || 0}`);
  if (pms && pms.length > 0) {
    pms.forEach((pm, i) => {
      console.log(`${i + 1}. ${pm.name} (${pm.email})`);
    });
  }
}

checkProjectsManagers();
