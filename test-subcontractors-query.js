// Test script: Verify companies query for subcontractors
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSubcontractorsQuery() {
  console.log('Testing companies query for subcontractors...\n');

  // Test the query that SubcontractorsSection.tsx uses
  const { data, error } = await supabase
    .from('companies')
    .select('id, name')
    .eq('is_subcontractor', true)
    .order('name');

  if (error) {
    console.error('❌ Error querying companies:', error.message);
    console.error('Full error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No subcontractors found in companies table');
    console.log('   Check if companies have is_subcontractor = true');
    return;
  }

  console.log(`✅ Found ${data.length} subcontractor(s):\n`);
  data.forEach((sub) => {
    console.log(`   - ${sub.name} (${sub.id})`);
  });
}

testSubcontractorsQuery();
