require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testModalQuery() {
  console.log('Testing ContactsModal query (lines 51-54)...\n');
  
  // This is the exact query from ContactsModal.tsx
  const [contactsRes, companiesRes] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, name, email, phone, contact_type, company_id')
      .order('name', { ascending: true }),
    supabase
      .from('companies')
      .select('id, name')
      .order('name', { ascending: true }),
  ]);

  if (contactsRes.error) {
    console.error('Contacts error:', contactsRes.error);
    return;
  }
  if (companiesRes.error) {
    console.error('Companies error:', companiesRes.error);
    return;
  }

  console.log(`Contacts returned: ${contactsRes.data?.length || 0}`);
  console.log(`Companies returned: ${companiesRes.data?.length || 0}\n`);

  // Create a map of company IDs to names (lines 66-68)
  const companyMap = new Map(
    (companiesRes.data ?? []).map((c) => [c.id, c.name])
  );

  // Map contacts with customer_name (lines 70-73)
  const contactsData = (contactsRes.data ?? []).map((c) => ({
    ...c,
    customer_name: c.company_id ? companyMap.get(c.company_id) ?? null : null,
  }));

  console.log('Contacts with customer names (what modal displays):');
  contactsData.forEach((c, i) => {
    console.log(`${i + 1}. ${c.name}`);
    console.log(`   Email: ${c.email}`);
    console.log(`   Phone: ${c.phone || '—'}`);
    console.log(`   Type: ${c.contact_type}`);
    console.log(`   Customer: ${c.customer_name || '—'}`);
    console.log('');
  });
  
  // Filter Project Managers and Estimators
  const pmAndEstimators = contactsData.filter(c => 
    c.contact_type === 'Project Manager' || c.contact_type === 'Estimator'
  );
  
  console.log(`\nProject Managers & Estimators: ${pmAndEstimators.length}`);
  pmAndEstimators.forEach(c => {
    console.log(`  - ${c.name} (${c.contact_type}) at ${c.customer_name}`);
  });
}

testModalQuery();
