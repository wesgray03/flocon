const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimpleJoins() {
  console.log('Testing simple JOINs...\n');

  // Test without filtering by type first
  console.log('Test: Get all engagements with company JOIN');
  const { data, error } = await supabase
    .from('engagements')
    .select(`
      id,
      name,
      type,
      company_id,
      companies (id, name)
    `)
    .limit(5);
  
  if (error) {
    console.log('❌ Error:', error.message);
  } else {
    console.log('✅ Success:');
    data.forEach(e => {
      console.log(`  - ${e.name} (${e.type}): company_id=${e.company_id}, company=${e.companies?.name || 'NULL'}`);
    });
  }

  // Now test contacts
  console.log('\n\nTest: Get engagements with contacts JOIN');
  const { data: data2, error: error2 } = await supabase
    .from('engagements')
    .select(`
      id,
      name,
      contact_id,
      contacts (id, name)
    `)
    .eq('type', 'prospect')
    .limit(5);
  
  if (error2) {
    console.log('❌ Error:', error2.message);
  } else {
    console.log('✅ Success:');
    data2.forEach(e => {
      console.log(`  - ${e.name}: contact_id=${e.contact_id}, contact=${e.contacts?.name || 'NULL'}`);
    });
  }
}

testSimpleJoins().catch(console.error);
