require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verify() {
  const { data } = await supabase
    .from('contacts')
    .select('name, email, contact_type')
    .eq('contact_type', 'Project Manager')
    .order('name');
  
  console.log(`✓ Total Project Managers in contacts: ${data.length}\n`);
  data.forEach((c, i) => {
    console.log(`${i + 1}. ${c.name}`);
  });
}

verify();
