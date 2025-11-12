require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkContactCompany() {
  console.log('Checking contact with company info...\n');
  
  // Get the contact
  const { data: contacts, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .eq('name', 'Adam Russell')
    .single();
  
  if (contactError) {
    console.error('Contact error:', contactError);
    return;
  }
  
  console.log('Contact:', contacts);
  console.log('');
  
  // Get the company
  if (contacts.company_id) {
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', contacts.company_id)
      .single();
    
    if (companyError) {
      console.error('Company error:', companyError);
    } else {
      console.log('Company:', company);
    }
  }
}

checkContactCompany();
