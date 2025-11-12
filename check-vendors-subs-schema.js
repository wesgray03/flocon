// Check current vendors and subcontractors schema
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Checking vendors table...\n');

  const { data: vendors, error: vendorsError } = await supabase
    .from('vendors')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (vendorsError && vendorsError.code !== 'PGRST116') {
    console.error('Vendors error:', vendorsError);
  } else if (vendors) {
    console.log('✅ Vendors columns:');
    console.log(Object.keys(vendors).join(', '));
    console.log('\nSample:', JSON.stringify(vendors, null, 2));
  } else {
    console.log('No vendors found');
  }

  console.log('\n\nChecking subcontractors table...\n');

  const { data: subs, error: subsError } = await supabase
    .from('subcontractors')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (subsError && subsError.code !== 'PGRST116') {
    console.error('Subcontractors error:', subsError);
  } else if (subs) {
    console.log('✅ Subcontractors columns:');
    console.log(Object.keys(subs).join(', '));
    console.log('\nSample:', JSON.stringify(subs, null, 2));
  } else {
    console.log('No subcontractors found');
  }

  console.log('\n\nChecking companies table...\n');

  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (companiesError && companiesError.code !== 'PGRST116') {
    console.error('Companies error:', companiesError);
  } else if (companies) {
    console.log('✅ Companies columns:');
    console.log(Object.keys(companies).join(', '));
    console.log('\nSample:', JSON.stringify(companies, null, 2));
  } else {
    console.log('No companies found');
  }
}

run();
