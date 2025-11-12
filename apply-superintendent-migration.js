// Apply the migration to allow superintendent role
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

// Use service role key for DDL operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Reading migration file...');
  const migrationSQL = fs.readFileSync(
    './db/migrations/2025-11-10-allow-superintendent-role.sql',
    'utf8'
  );

  console.log('Applying migration to allow superintendent role...\n');

  const { data, error } = await supabase.rpc('exec_sql', {
    sql_string: migrationSQL,
  });

  if (error) {
    console.error('Migration failed:', error);
    console.error(
      '\nYou may need to run this migration manually via the Supabase SQL editor.'
    );
    console.error(
      'File: db/migrations/2025-11-10-allow-superintendent-role.sql\n'
    );
    process.exit(1);
  }

  console.log('✓ Migration applied successfully');
  console.log('\nYou can now assign superintendents via engagement_parties.');
}

run().then(() => process.exit(0));
