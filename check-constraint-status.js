// Check current engagement_parties constraint and allowed roles
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Checking engagement_parties table constraints...\n');

  // Try to query the table structure
  const { data: sample, error: sampleErr } = await supabase
    .from('engagement_parties')
    .select('*')
    .limit(1);

  if (sampleErr) {
    console.error('Error querying engagement_parties:', sampleErr);
    return;
  }

  console.log('✓ engagement_parties table is accessible');
  console.log(
    'Sample row structure:',
    sample?.[0] ? Object.keys(sample[0]) : 'No rows yet'
  );

  // Try inserting a test superintendent role (rollback after)
  console.log('\n\nAttempting test insert with superintendent role...');
  const testId = '00000000-0000-0000-0000-000000000001';
  const { data: insertTest, error: insertErr } = await supabase
    .from('engagement_parties')
    .insert({
      engagement_id: testId,
      party_type: 'contact',
      party_id: testId,
      role: 'superintendent',
      is_primary: true,
    })
    .select();

  if (insertErr) {
    console.error('❌ Test insert failed:', insertErr.message);
    console.error('   Code:', insertErr.code);
    console.error('\nThis means the migration has NOT been applied yet.');
    console.error('Please run the SQL from:');
    console.error('  db/migrations/2025-11-10-allow-superintendent-role.sql');
    console.error('in the Supabase SQL Editor.');
  } else {
    console.log('✓ Test insert succeeded!');
    console.log('  The constraint now allows superintendent role.');

    // Clean up test row
    await supabase
      .from('engagement_parties')
      .delete()
      .eq('engagement_id', testId);
    console.log('  (Test row cleaned up)');
  }
}

run().then(() => process.exit(0));
