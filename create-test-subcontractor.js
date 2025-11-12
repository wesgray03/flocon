// Create a test subcontractor
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createTestSubcontractor() {
  console.log('Creating test subcontractor...\n');

  // Insert a company with is_subcontractor = true
  const { data: company, error: compError } = await supabase
    .from('companies')
    .insert({
      name: 'Test Subcontractor Co.',
      company_type: 'Subcontractor',
      is_subcontractor: true,
    })
    .select()
    .single();

  if (compError) {
    console.error('❌ Error creating company:', compError);
    process.exit(1);
  }

  console.log('✅ Created company:', company.name);
  console.log('   ID:', company.id);

  // Add subcontractor details
  const { data: details, error: detailsError } = await supabase
    .from('company_subcontractor_details')
    .insert({
      company_id: company.id,
      scope: 'Flooring installation',
      license_number: 'TEST-123',
    })
    .select()
    .single();

  if (detailsError) {
    console.error('⚠️  Error adding details:', detailsError);
  } else {
    console.log('✅ Added subcontractor details');
  }

  // Verify it shows up in the view
  const { data: viewData, error: viewError } = await supabase
    .from('subcontractors_view')
    .select('*')
    .eq('id', company.id)
    .single();

  if (viewError) {
    console.error('❌ Error checking view:', viewError);
  } else {
    console.log('\n✅ Verified in subcontractors_view:');
    console.log('   Name:', viewData.name);
    console.log('   Scope:', viewData.scope);
  }

  process.exit(0);
}

createTestSubcontractor();
