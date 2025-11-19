// Find all projects for Aagaard-Juergensen, LLC
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findProjects() {
  // Get the company ID
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, qbo_id')
    .eq('name', 'Aagaard-Juergensen, LLC')
    .single();

  console.log(`Company: ${company.name}`);
  console.log(`QB ID: ${company.qbo_id}\n`);

  // Find all engagement_parties with this company as customer
  const { data: parties } = await supabase
    .from('engagement_parties')
    .select('engagement_id, role')
    .eq('party_id', company.id)
    .eq('party_type', 'company')
    .eq('role', 'customer');

  if (!parties || parties.length === 0) {
    console.log('No projects found for this company');
    return;
  }

  console.log(`Found ${parties.length} project(s) for this company:\n`);

  // Get project details
  const engagementIds = parties.map((p) => p.engagement_id);
  const { data: projects } = await supabase
    .from('engagements')
    .select('id, project_number, name, qbo_customer_id, qbo_job_id')
    .in('id', engagementIds)
    .order('project_number');

  projects.forEach((p) => {
    console.log(`  ${p.project_number} - ${p.name}`);
    console.log(`    QB Customer: ${p.qbo_customer_id || 'not synced'}`);
    console.log(`    QB Job: ${p.qbo_job_id || 'not synced'}`);
    console.log('');
  });
}

findProjects().catch(console.error);
