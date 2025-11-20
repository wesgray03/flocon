require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkProject() {
  const projectId = 'e4ac4d86-8eca-474f-a91a-af42668d1b64';

  console.log('Checking project retainage settings...\n');

  // Get project details
  const { data: project, error } = await supabase
    .from('engagements')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('Error fetching project:', error);
    return;
  }

  console.log('Project:', project.name);
  console.log('Contract Amount:', project.contract_amount);
  console.log('Contract Budget:', project.contract_budget);
  console.log('\nRetainage-related fields:');
  console.log(
    'Fields in project:',
    Object.keys(project).filter((k) => k.toLowerCase().includes('retain'))
  );

  // Get SOV lines
  const { data: sovLines, error: sovError } = await supabase
    .from('engagement_sov_lines')
    .select('*')
    .eq('engagement_id', projectId)
    .order('created_at');

  if (sovError) {
    console.error('Error fetching SOV lines:', sovError);
    return;
  }

  console.log('\nSOV Lines count:', sovLines.length);

  if (sovLines.length > 0) {
    console.log('\nSOV Lines:');
    sovLines.forEach((line) => {
      console.log(`\nLine: ${line.description}`);
      console.log(`  Line Code: ${line.line_code}`);
      console.log(`  Quantity: ${line.quantity}`);
      console.log(`  Unit Cost: ${line.unit_cost}`);
      console.log(`  Extended Cost: ${line.extended_cost}`);
      console.log(`  Retainage Percent: ${line.retainage_percent}%`);
      console.log(`  Category: ${line.category}`);
    });
  }
}

checkProject()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
