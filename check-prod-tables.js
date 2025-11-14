const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTEwMDM4OSwiZXhwIjoyMDQ0Njc2Mzg5fQ.zHG8013KgspyCPaAxYxbTyV4y9JbFYCfxX_SJ1qC4yA'
);

(async () => {
  console.log('Checking engagements table...');
  const { data: engagements, error: engError } = await supabase
    .from('engagements')
    .select('id, name, project_number')
    .limit(5);

  console.log(
    'Engagements:',
    engagements?.length || 0,
    engError?.message || ''
  );

  console.log('\nChecking projects table...');
  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id, name, project_number')
    .limit(5);

  console.log('Projects:', projects?.length || 0, projError?.message || '');

  console.log('\nChecking projects_v view...');
  const { data: projectsV, error: viewError } = await supabase
    .from('projects_v')
    .select('id, name, project_number')
    .limit(5);

  console.log('Projects_v:', projectsV?.length || 0, viewError?.message || '');
  if (projectsV && projectsV.length > 0) {
    projectsV.forEach((p) => console.log(`  ${p.project_number}: ${p.name}`));
  }
})();
