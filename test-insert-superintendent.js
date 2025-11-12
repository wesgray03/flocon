// Test direct insertion of superintendent party
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const engagementId = process.argv[2];
const contactId = process.argv[3] || '0ed47278-679f-4b35-9cd4-348b268d7412'; // 'test' superintendent

if (!engagementId) {
  console.error(
    'Usage: node test-insert-superintendent.js <engagement_id> [contact_id]'
  );
  process.exit(1);
}

async function run() {
  console.log(
    `Attempting to set superintendent for engagement ${engagementId}`
  );
  console.log(`Using contact ID: ${contactId}`);

  // 1. Clear existing primary superintendent
  console.log('\n1. Clearing existing primary superintendent...');
  const { error: clearErr } = await supabase
    .from('engagement_parties')
    .update({ is_primary: false })
    .eq('engagement_id', engagementId)
    .eq('role', 'superintendent')
    .eq('is_primary', true);

  if (clearErr) {
    console.error('Clear error:', clearErr);
  } else {
    console.log('✓ Cleared existing primary');
  }

  // 2. Upsert new superintendent
  console.log('\n2. Upserting new superintendent party...');
  const { data, error: upsertErr } = await supabase
    .from('engagement_parties')
    .upsert(
      [
        {
          engagement_id: engagementId,
          party_type: 'contact',
          party_id: contactId,
          role: 'superintendent',
          is_primary: true,
          notes: null,
        },
      ],
      { onConflict: 'engagement_id,party_id,role' }
    )
    .select();

  if (upsertErr) {
    console.error('Upsert error:', JSON.stringify(upsertErr, null, 2));
    console.error('\nError details:');
    console.error('  Code:', upsertErr.code);
    console.error('  Message:', upsertErr.message);
    console.error('  Details:', upsertErr.details);
    console.error('  Hint:', upsertErr.hint);
  } else {
    console.log('✓ Upsert successful:', data);
  }

  // 3. Verify
  console.log('\n3. Verifying superintendent assignment...');
  const { data: verify, error: verifyErr } = await supabase
    .from('engagement_parties_detailed')
    .select('role, party_name, is_primary')
    .eq('engagement_id', engagementId)
    .eq('role', 'superintendent');

  if (verifyErr) {
    console.error('Verify error:', verifyErr);
  } else {
    console.log('Current superintendent parties:', verify);
  }
}

run().then(() => process.exit(0));
