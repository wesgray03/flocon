// Migrate owner text field to user_id FK
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Missing credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

(async () => {
  console.log('🔄 Migrating owner text field to user_id FK...');
  console.log(`📍 Database: ${url}\n`);

  // Read the migration file
  const sql = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'db',
      'migrations',
      '2025-11-10-migrate-owner-to-user-id.sql'
    ),
    'utf8'
  );

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('❌ Error executing migration:', error);
      process.exit(1);
    }

    console.log('✅ Migration successful!');
    console.log('Result:', data);

    // Verify migration
    console.log('\n🔍 Verifying migration...');

    // Check if owner column is gone
    const { data: testData, error: testError } = await supabase
      .from('engagements')
      .select('owner')
      .limit(1);

    if (testError && testError.message.includes('column')) {
      console.log('✅ owner column successfully removed');
    } else {
      console.log('⚠️  owner column still present');
    }

    // Check user_id values
    const { data: userIds } = await supabase
      .from('engagements')
      .select('id, user_id')
      .not('user_id', 'is', null)
      .limit(5);

    if (userIds && userIds.length > 0) {
      console.log(
        `✅ Found ${userIds.length} engagements with user_id set (showing sample)`
      );
      console.log(userIds);
    } else {
      console.log(
        'ℹ️  No engagements with user_id yet (may be normal if no owner text matched users)'
      );
    }
  } catch (err) {
    console.error('💥 Unexpected error:', err);
    process.exit(1);
  }
})();
