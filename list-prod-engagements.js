import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw'
);

async function listEngagements() {
  const { data, error } = await supabase
    .from('engagements')
    .select('id, project_number, name')
    .in('project_number', [1304, 1284, 1276, 1273, 1237, 1292, 1282])
    .order('project_number');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\nProduction Engagements:');
  console.log('─────────────────────────────────────────────────────────────');
  data.forEach((e) => {
    console.log(`Project ${e.project_number}: ${e.id}`);
    console.log(`  Name: ${e.name}`);
  });
  console.log(`\nTotal: ${data.length} projects found`);
}

listEngagements();
