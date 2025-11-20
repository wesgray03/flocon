require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
const { join } = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runMigration() {
  console.log('🔧 Adding is_follow_up column to engagement_comments...\n');

  try {
    // Check if column already exists
    const { data: testData, error: testError } = await supabase
      .from('engagement_comments')
      .select('is_follow_up')
      .limit(1);

    if (!testError) {
      console.log('✅ Column is_follow_up already exists!\n');
      return;
    }

    // Column doesn't exist, we need to add it
    console.log('Column does not exist, attempting to add via SQL...\n');
    console.log(
      'Note: You may need to run this SQL manually in Supabase SQL Editor:\n'
    );
    console.log('---');

    const migrationSQL = readFileSync(
      join(__dirname, 'db/migrations/2025-11-20-add-follow-up-to-comments.sql'),
      'utf-8'
    );

    console.log(migrationSQL);
    console.log('---\n');

    console.log(
      'After running the SQL, the follow-up checkbox will work correctly.'
    );
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
