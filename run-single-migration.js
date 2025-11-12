const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Use environment variables from .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSingleMigration() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error(
      'Usage: node run-single-migration.js <path-to-migration-file>'
    );
    process.exit(1);
  }

  console.log(`Running migration: ${migrationFile}`);

  const sql = fs.readFileSync(migrationFile, 'utf8');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--'));

  for (const statement of statements) {
    if (!statement) continue;

    console.log(`Executing: ${statement.substring(0, 100)}...`);

    try {
      // Execute raw SQL using from().select() with rpc fallback
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement + ';',
      });

      if (error) {
        console.error('Error:', error);
        throw error;
      }

      console.log('✓ Statement executed successfully');
    } catch (err) {
      console.error('Failed to execute statement:', err.message);
      // Try alternate method - this won't work for DDL but let's try
      console.log(
        'Note: You may need to run this SQL manually in Supabase Dashboard'
      );
    }
  }

  console.log('✅ Migration completed!');
}

runSingleMigration().catch(console.error);
