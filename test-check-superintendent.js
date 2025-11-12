// Verify superintendent now comes from engagement_parties_detailed via project_dashboard
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const id = process.argv[2];
if (!id) {
  console.error('Usage: node test-check-superintendent.js <engagement_id>');
  process.exit(1);
}

async function run() {
  console.log('Checking project_dashboard row for engagement id:', id);
  const { data, error } = await supabase
    .from('project_dashboard')
    .select(
      'id, project_name, superintendent, foreman, contract_amt, billed_amt'
    )
    .eq('id', id)
    .single();
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Row:', data);
  }
}

run().then(() => process.exit(0));
