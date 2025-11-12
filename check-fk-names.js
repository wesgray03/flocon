const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testJoin() {
  console.log('Testing different JOIN syntaxes...\n');

  // Test 1: Without explicit foreign key (will fail)
  console.log('Test 1: Simple JOIN without FK hint');
  const { data: test1, error: error1 } = await supabase
    .from('engagements')
    .select('id, name, customer:companies(name)')
    .eq('type', 'prospect')
    .limit(1);
  
  if (error1) {
    console.log('❌ Error:', error1.message);
  } else {
    console.log('✅ Success:', test1);
  }

  // Test 2: With column name hint
  console.log('\nTest 2: JOIN with column name hint');
  const { data: test2, error: error2 } = await supabase
    .from('engagements')
    .select('id, name, customer:companies!company_id(name)')
    .eq('type', 'prospect')
    .limit(1);
  
  if (error2) {
    console.log('❌ Error:', error2.message);
  } else {
    console.log('✅ Success:', test2);
  }

  // Test 3: Multiple JOINs
  console.log('\nTest 3: Multiple JOINs to same table');
  const { data: test3, error: error3 } = await supabase
    .from('engagements')
    .select(`
      id, 
      name,
      customer:companies!company_id(name),
      architect:companies!architect_id(name)
    `)
    .eq('type', 'prospect')
    .limit(1);
  
  if (error3) {
    console.log('❌ Error:', error3.message);
  } else {
    console.log('✅ Success:', JSON.stringify(test3, null, 2));
  }

  // Test 4: Check if maybe we need the actual FK constraint name
  console.log('\nTest 4: Let\'s try with fkey suffix');
  const { data: test4, error: error4 } = await supabase
    .from('engagements')
    .select(`
      id, 
      name,
      customer:companies!engagements_company_id_fkey(name),
      architect:companies!engagements_architect_id_fkey(name)
    `)
    .eq('type', 'prospect')
    .limit(1);
  
  if (error4) {
    console.log('❌ Error:', error4.message);
  } else {
    console.log('✅ Success:', JSON.stringify(test4, null, 2));
  }
}

testJoin().catch(console.error);
