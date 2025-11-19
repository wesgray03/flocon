// Reassign projects from Aagaard-Juergensen, LLC to Aagaard-Juergensen Construction
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function reassignProjects() {
  // Get both companies
  const { data: llcCompany } = await supabase
    .from('companies')
    .select('id, name, qbo_id')
    .eq('name', 'Aagaard-Juergensen, LLC')
    .single();

  const { data: constructionCompany } = await supabase
    .from('companies')
    .select('id, name, qbo_id')
    .eq('name', 'Aagaard-Juergensen Construction')
    .maybeSingle();

  if (!constructionCompany) {
    console.log('Creating Aagaard-Juergensen Construction company...');
    const { data: newCompany, error } = await supabase
      .from('companies')
      .insert({
        name: 'Aagaard-Juergensen Construction',
        type: 'Customer',
        qbo_id: '2591',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating company:', error);
      return;
    }
    console.log(`✅ Created company with ID: ${newCompany.id}\n`);
    constructionCompany = newCompany;
  } else {
    console.log(`Found existing Aagaard-Juergensen Construction (ID: ${constructionCompany.id})`);
    console.log(`QB ID: ${constructionCompany.qbo_id}\n`);
  }

  // Get all engagement_parties for LLC
  const { data: parties } = await supabase
    .from('engagement_parties')
    .select('id, engagement_id, role')
    .eq('party_id', llcCompany.id)
    .eq('party_type', 'company')
    .eq('role', 'customer');

  console.log(`Reassigning ${parties.length} project(s)...\n`);

  // Update each party to point to Construction company
  for (const party of parties) {
    const { error } = await supabase
      .from('engagement_parties')
      .update({ party_id: constructionCompany.id })
      .eq('id', party.id);

    if (error) {
      console.error(`Error updating party ${party.id}:`, error);
    } else {
      // Get project name
      const { data: project } = await supabase
        .from('engagements')
        .select('project_number, name')
        .eq('id', party.engagement_id)
        .single();
      console.log(`✅ ${project.project_number || 'N/A'} - ${project.name}`);
    }
  }

  console.log(`\n✅ All projects reassigned to Aagaard-Juergensen Construction`);
  console.log(`\nYou can now delete Aagaard-Juergensen, LLC from FloCon`);
}

reassignProjects().catch(console.error);
