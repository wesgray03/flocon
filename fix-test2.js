// Fix test2 to set is_subcontractor flag
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixTest2() {
  console.log('Fixing test2...\n');

  const { data, error } = await supabase
    .from('companies')
    .update({ is_subcontractor: true })
    .eq('name', 'test2')
    .select();

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('✅ Updated test2:');
  console.log('   is_subcontractor:', data[0].is_subcontractor);

  // Verify in view
  const { data: viewData, error: viewError } = await supabase
    .from('subcontractors_view')
    .select('id, name')
    .order('name');

  if (viewError) {
    console.error('❌ Error checking view:', viewError);
  } else {
    console.log(`\n✅ Subcontractors in view (${viewData.length}):`);
    viewData.forEach((s) => {
      console.log(`  - ${s.name}`);
    });
  }

  process.exit(0);
}

fixTest2();
