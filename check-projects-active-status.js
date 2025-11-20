// check-projects-active-status.js
// Check the active status of projects

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProjectsActiveStatus() {
  try {
    console.log('=== CHECKING PROJECTS ACTIVE STATUS ===\n');

    const { data: projects, error } = await supabase
      .from('engagements')
      .select('id, name, project_number, type, active')
      .eq('type', 'project')
      .order('project_number', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(`Found ${projects?.length || 0} projects (showing first 10):\n`);

    const activeTrue = projects?.filter(p => p.active === true).length || 0;
    const activeFalse = projects?.filter(p => p.active === false).length || 0;
    const activeNull = projects?.filter(p => p.active === null).length || 0;

    console.log('Summary:');
    console.log(`- active = true: ${activeTrue}`);
    console.log(`- active = false: ${activeFalse}`);
    console.log(`- active = null: ${activeNull}\n`);

    console.log('Sample projects:');
    projects?.slice(0, 10).forEach((p, i) => {
      console.log(`${i + 1}. ${p.project_number || 'N/A'} - ${p.name}`);
      console.log(`   active: ${p.active}`);
    });

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkProjectsActiveStatus();
