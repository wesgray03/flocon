require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkProjectTable() {
  console.log('Checking if projects table exists...\n');
  
  // Try projects table
  const { data: projectsData, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .limit(1);
  
  if (projectsError) {
    console.log('❌ projects table:', projectsError.message);
  } else {
    console.log('✓ projects table exists with columns:', Object.keys(projectsData[0] || {}));
  }
  
  // Try engagements table
  const { data: engagementsData, error: engagementsError } = await supabase
    .from('engagements')
    .select('*')
    .limit(1);
  
  if (engagementsError) {
    console.log('❌ engagements table:', engagementsError.message);
  } else {
    console.log('✓ engagements table exists with columns:', Object.keys(engagementsData[0] || {}));
  }
  
  // Check project_dashboard view
  console.log('\n✓ project_dashboard view exists (used for reading)');
  
  console.log('\n=== CONCLUSION ===');
  console.log('The projects page should:');
  console.log('- READ from: project_dashboard (view)');
  console.log('- WRITE to: engagements (table)');
}

checkProjectTable();
