const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  console.log('='.repeat(80));
  console.log('DATABASE SCHEMA INSPECTION');
  console.log('='.repeat(80));

  // Inspect engagements table
  console.log('\n📋 ENGAGEMENTS TABLE:');
  const { data: engagements, error: engError } = await supabase
    .from('engagements')
    .select('*')
    .eq('type', 'prospect')
    .limit(1);
  
  if (engagements && engagements[0]) {
    console.log('Columns:', Object.keys(engagements[0]));
    console.log('\nSample row:', JSON.stringify(engagements[0], null, 2));
  } else {
    console.log('Error or no data:', engError);
  }

  // Inspect companies table
  console.log('\n\n🏢 COMPANIES TABLE:');
  const { data: companies, error: compError } = await supabase
    .from('companies')
    .select('*')
    .limit(3);
  
  if (companies && companies.length > 0) {
    console.log('Columns:', Object.keys(companies[0]));
    console.log('\nSample rows:');
    companies.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} - Type: ${c.company_type}, Customer: ${c.is_customer}`);
    });
  } else {
    console.log('Error or no data:', compError);
  }

  // Inspect contacts table
  console.log('\n\n👤 CONTACTS TABLE:');
  const { data: contacts, error: contError } = await supabase
    .from('contacts')
    .select('*')
    .limit(3);
  
  if (contacts && contacts.length > 0) {
    console.log('Columns:', Object.keys(contacts[0]));
    console.log('\nSample rows:');
    contacts.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} - Type: ${c.contact_type}, Company: ${c.company_id}`);
    });
  } else {
    console.log('Error or no data:', contError);
  }

  // Inspect users table
  console.log('\n\n👥 USERS TABLE:');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(3);
  
  if (users && users.length > 0) {
    console.log('Columns:', Object.keys(users[0]));
    console.log('\nSample rows:');
    users.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.name} - Type: ${u.user_type}, Email: ${u.email}`);
    });
  } else {
    console.log('Error or no data:', usersError);
  }

  // Count records
  console.log('\n\n📊 RECORD COUNTS:');
  
  const { count: prospectCount } = await supabase
    .from('engagements')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'prospect');
  console.log(`  Prospects: ${prospectCount}`);

  const { count: customerCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('is_customer', true);
  console.log(`  Customer Companies: ${customerCount}`);

  const { count: architectCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('company_type', 'Architect');
  console.log(`  Architect Companies: ${architectCount}`);

  const { count: pmCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .in('contact_type', ['Project Manager', 'Estimator']);
  console.log(`  PM/Estimator Contacts: ${pmCount}`);

  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  console.log(`  Users: ${userCount}`);

  console.log('\n' + '='.repeat(80));
}

inspectSchema().catch(console.error);
