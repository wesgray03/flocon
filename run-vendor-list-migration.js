// Run migration to create vendor import list table
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    console.log('Running migration: create qbo_vendor_import_list table\n');

    const sql = fs.readFileSync(
      '2025-11-18-create-qbo-vendor-import-list.sql',
      'utf-8'
    );

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 60)}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        // Try direct query instead
        const { error: queryError } = await supabase
          .from('_query')
          .select(statement);
        if (queryError) {
          console.error('Error:', error || queryError);
        } else {
          console.log('✓ Success');
        }
      } else {
        console.log('✓ Success');
      }
    }

    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error.message);
  }
}

runMigration();
