// Check all references to LLC company
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkReferences() {
  const { data: llcCompany } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', 'Aagaard-Juergensen, LLC')
    .single();

  console.log(`Checking all references to: ${llcCompany.name}\n`);

  // Check engagement_parties
  const { data: parties } = await supabase
    .from('engagement_parties')
    .select('id, engagement_id, role')
    .eq('party_id', llcCompany.id)
    .eq('party_type', 'company');

  console.log(`engagement_parties: ${parties?.length || 0} records`);

  // Check contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, first_name, last_name')
    .eq('company_id', llcCompany.id);

  console.log(`contacts: ${contacts?.length || 0} records`);

  if (contacts && contacts.length > 0) {
    console.log('\nContacts:');
    contacts.forEach(c => console.log(`  - ${c.first_name} ${c.last_name}`));
  }

  // Check invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number')
    .eq('customer_id', llcCompany.id);

  console.log(`invoices: ${invoices?.length || 0} records`);

  // Check estimates
  const { data: estimates } = await supabase
    .from('estimates')
    .select('id')
    .eq('customer_id', llcCompany.id);

  console.log(`estimates: ${estimates?.length || 0} records`);
}

checkReferences().catch(console.error);
