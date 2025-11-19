// Check and reassign contacts from LLC to Construction
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function reassignContacts() {
  // Get both companies
  const { data: llcCompany } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', 'Aagaard-Juergensen, LLC')
    .single();

  const { data: constructionCompany } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', 'Aagaard-Juergensen Construction')
    .single();

  console.log(`Checking contacts for ${llcCompany.name}...\n`);

  // Get contacts for LLC
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, company_id')
    .eq('company_id', llcCompany.id);

  if (!contacts || contacts.length === 0) {
    console.log('No contacts found for LLC\n');
  } else {
    console.log(`Found ${contacts.length} contact(s):\n`);
    
    // Reassign each contact to Construction company
    for (const contact of contacts) {
      const { error } = await supabase
        .from('contacts')
        .update({ company_id: constructionCompany.id })
        .eq('id', contact.id);

      if (error) {
        console.error(`Error updating contact ${contact.first_name} ${contact.last_name}:`, error);
      } else {
        console.log(`✅ ${contact.first_name} ${contact.last_name}`);
      }
    }
    console.log('');
  }

  console.log(`✅ All contacts reassigned to ${constructionCompany.name}`);
  console.log('\nNow you can delete Aagaard-Juergensen, LLC from FloCon');
}

reassignContacts().catch(console.error);
