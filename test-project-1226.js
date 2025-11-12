// Test if project 1226 shows billing data in the dashboard view
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProject1226() {
  console.log('Testing project 1226 billing data...\n');

  // Query the dashboard view for project 1226
  const { data, error } = await supabase
    .from('project_dashboard')
    .select('*')
    .eq('project_number', '1226')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data) {
    console.log('❌ Project 1226 not found');
    return;
  }

  console.log('✅ Project found:', data.project_name);
  console.log('\nAll columns:', Object.keys(data));
  console.log('\nBilling Summary:');
  console.log('  Contract Amount:', data.contract_amt || data.contract_amount);
  console.log('  Change Orders:  ', data.co_amt);
  console.log('  Total:          ', data.total_amt);
  console.log('  Billed:         ', data.billed_amt);
  console.log('  Balance:        ', data.balance);

  const billedAmt = data.billed_amt || 0;
  if (billedAmt > 0) {
    console.log('\n✅ SUCCESS! Billing data is now showing on the dashboard!');
  } else {
    console.log(
      '\n⚠️  Billed amount is still $0 - may need to check if pay_apps exist for this project'
    );
  }
}

testProject1226().then(() => {
  console.log('\nTest complete');
  process.exit(0);
});
