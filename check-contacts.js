require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkContacts() {
  console.log('Fetching all contacts...\n');
  
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Total contacts: ${data?.length || 0}\n`);
  
  if (data && data.length > 0) {
    console.log('Contact details:');
    data.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name}`);
      console.log(`   Email: ${c.email}`);
      console.log(`   Type: ${c.contact_type}`);
      console.log(`   Company ID: ${c.company_id || 'N/A'}`);
      console.log(`   Phone: ${c.phone || 'N/A'}`);
      console.log('');
    });
    
    // Group by contact_type
    const byType = {};
    data.forEach(c => {
      if (!byType[c.contact_type]) byType[c.contact_type] = 0;
      byType[c.contact_type]++;
    });
    
    console.log('\nBreakdown by contact_type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  } else {
    console.log('No contacts found in database.');
  }
}

checkContacts();
