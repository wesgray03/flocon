require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
});

async function runMigration() {
  console.log('Running migration: Add superintendent and foreman columns\n');

  try {
    // Read migration file
    const migrationSQL = readFileSync(
      'db/migrations/2025-11-10-add-superintendent-foreman.sql',
      'utf-8'
    );

    // Execute migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration successful!');
    console.log('\nChanges made:');
    console.log('  - Added superintendent_id column (FK to users)');
    console.log('  - Added foreman_id column (FK to users)');
    console.log('  - Created indexes for performance');

    // Verify columns exist
    const { data, error: verifyError } = await supabase
      .from('engagements')
      .select('superintendent_id, foreman_id')
      .limit(1);

    if (!verifyError) {
      console.log('\n✅ Columns verified successfully');
    }
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

runMigration();
