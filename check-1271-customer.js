// Check customer for project 1271 in CRM
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCustomer() {
  // Get project
  const { data: project } = await supabase
    .from('engagements')
    .select('id, project_number, name')
    .eq('project_number', '1271')
    .single();

  console.log('Project 1271:');
  console.log(`  Name: ${project.name}\n`);

  // Get customer party
  const { data: party } = await supabase
    .from('engagement_parties')
    .select('party_id, party_type')
    .eq('engagement_id', project.id)
    .eq('role', 'customer')
    .eq('is_primary', true)
    .maybeSingle();

  if (!party) {
    console.log('No customer found');
    return;
  }

  // Get company
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, qbo_id')
    .eq('id', party.party_id)
    .single();

  console.log('Customer in CRM:');
  console.log(`  Company: ${company.name}`);
  console.log(`  QB ID: ${company.qbo_id || 'NOT SET'}`);
}

checkCustomer().catch(console.error);
