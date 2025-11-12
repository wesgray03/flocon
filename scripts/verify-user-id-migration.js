const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyUserIdMigration() {
  console.log('Checking engagements for user_id field...\n');

  // Check a sample of engagements
  const { data, error } = await supabase
    .from('engagements')
    .select('id, name, user_id')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} engagements:`);
  data.forEach((e) => {
    console.log(`  - ${e.name}: user_id = ${e.user_id || '(null)'}`);
  });

  const withUserId = data.filter((e) => e.user_id !== null).length;
  console.log(`\n${withUserId} of ${data.length} have user_id set`);

  // Verify owner column no longer exists
  console.log('\nAttempting to query owner field (should fail)...');
  const { error: ownerError } = await supabase
    .from('engagements')
    .select('owner')
    .limit(1);

  if (ownerError) {
    console.log('✅ owner column successfully removed:', ownerError.message);
  } else {
    console.log('⚠️ owner column still exists!');
  }
}

verifyUserIdMigration().catch(console.error);
