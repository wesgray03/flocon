// Check subcontractors_view
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkView() {
  console.log('Checking subcontractors_view...\n');

  const { data, error } = await supabase
    .from('subcontractors_view')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log(`✅ Found ${data.length} subcontractors`);
    if (data.length > 0) {
      console.log('\nColumns:', Object.keys(data[0]).join(', '));
      console.log('\nSample records:');
      data.forEach((s) => {
        console.log(`  - ${s.name} (id: ${s.id})`);
      });
    } else {
      console.log('\n⚠️  No subcontractors found in the view');
      console.log("\nLet's check the companies table...\n");

      const { data: companies, error: compError } = await supabase
        .from('companies')
        .select('id, name, company_type, is_subcontractor')
        .limit(10);

      if (compError) {
        console.error('❌ Error checking companies:', compError);
      } else {
        console.log(`Found ${companies.length} companies:`);
        companies.forEach((c) => {
          console.log(
            `  - ${c.name} (type: ${c.company_type}, is_subcontractor: ${c.is_subcontractor})`
          );
        });
      }
    }
  }

  process.exit(0);
}

checkView();
