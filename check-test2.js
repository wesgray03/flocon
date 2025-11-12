// Check test2 company
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTest2() {
  console.log('Checking for "test2" company...\n');

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, company_type, is_subcontractor, is_customer, is_vendor')
    .ilike('name', '%test%');

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log(`Found ${companies.length} test companies:\n`);
  companies.forEach((c) => {
    console.log(`Name: ${c.name}`);
    console.log(`  ID: ${c.id}`);
    console.log(`  Type: ${c.company_type}`);
    console.log(`  is_subcontractor: ${c.is_subcontractor}`);
    console.log(`  is_customer: ${c.is_customer}`);
    console.log(`  is_vendor: ${c.is_vendor}`);
    console.log('');
  });

  // Check what's in the view
  const { data: viewData, error: viewError } = await supabase
    .from('subcontractors_view')
    .select('id, name')
    .ilike('name', '%test%');

  if (viewError) {
    console.error('❌ Error checking view:', viewError);
  } else {
    console.log(`\nIn subcontractors_view (${viewData.length}):`);
    viewData.forEach((s) => {
      console.log(`  - ${s.name} (${s.id})`);
    });
  }

  process.exit(0);
}

checkTest2();
