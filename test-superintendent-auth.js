// Test superintendent insertion with actual user authentication
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

const engagementId = process.argv[2] || '3cf0e210-ccda-444f-a440-4a3082e80391';
const contactId = process.argv[3] || '0ed47278-679f-4b35-9cd4-348b268d7412';

async function run() {
  console.log('\n=== Superintendent Assignment Test (Authenticated) ===\n');

  // Check current session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    console.log('No active session found. You need to sign in first.\n');
    const email = await question('Email: ');
    const password = await question('Password: ');

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

    if (authError) {
      console.error('\n❌ Authentication failed:', authError.message);
      rl.close();
      process.exit(1);
    }

    console.log('\n✓ Signed in as:', authData.user?.email);
  } else {
    console.log('✓ Already signed in as:', session.user.email);
  }

  console.log(`\nEngagement ID: ${engagementId}`);
  console.log(`Contact ID: ${contactId} (superintendent 'test')\n`);

  // Now try the upsert with authenticated session
  console.log('1. Clearing existing primary superintendent...');
  const { error: clearErr } = await supabase
    .from('engagement_parties')
    .update({ is_primary: false })
    .eq('engagement_id', engagementId)
    .eq('role', 'superintendent')
    .eq('is_primary', true);

  if (clearErr) {
    console.error('   Clear error:', clearErr.message);
  } else {
    console.log('   ✓ Cleared');
  }

  console.log('\n2. Upserting new superintendent...');
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
    console.error('   ❌ Upsert failed!');
    console.error('   Code:', upsertErr.code);
    console.error('   Message:', upsertErr.message);
    console.error('   Details:', upsertErr.details);
    console.error('   Hint:', upsertErr.hint);

    if (upsertErr.code === '23514') {
      console.error(
        '\n   >> The CHECK constraint still rejects superintendent role.'
      );
      console.error(
        '   >> Please re-run the migration in Supabase SQL Editor:'
      );
      console.error(
        '   >> db/migrations/2025-11-10-allow-superintendent-role.sql'
      );
    }
  } else {
    console.log('   ✓ Success!', data);
  }

  console.log('\n3. Verifying via engagement_parties_detailed...');
  const { data: verify, error: verifyErr } = await supabase
    .from('engagement_parties_detailed')
    .select('role, party_name, is_primary')
    .eq('engagement_id', engagementId)
    .eq('role', 'superintendent');

  if (verifyErr) {
    console.error('   Error:', verifyErr.message);
  } else if (verify && verify.length > 0) {
    console.log('   ✓ Superintendent:', verify[0].party_name);
  } else {
    console.log('   (No superintendent assigned)');
  }

  console.log('\n4. Checking project_dashboard view...');
  const { data: dashboard, error: dashErr } = await supabase
    .from('project_dashboard')
    .select('project_name, superintendent, foreman')
    .eq('id', engagementId)
    .single();

  if (dashErr) {
    console.error('   Error:', dashErr.message);
  } else {
    console.log('   Project:', dashboard.project_name);
    console.log('   Superintendent:', dashboard.superintendent || '(null)');
    console.log('   Foreman:', dashboard.foreman || '(null)');
  }

  rl.close();
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unexpected error:', err);
    rl.close();
    process.exit(1);
  });
