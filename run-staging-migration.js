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

async function runMigration() {
  const migrationPath = path.join(__dirname, 'db', 'migrations');

  // Get all SQL files and sort them
  const files = fs
    .readdirSync(migrationPath)
    .filter((file) => file.endsWith('.sql'))
    .filter((file) => !file.startsWith('NUCLEAR') && !file.startsWith('README'))
    .sort();

  console.log('Running migrations for STAGING environment...');

  for (const file of files) {
    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationPath, file), 'utf8');

    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error(`Error in ${file}:`, error);
      } else {
        console.log(`✅ ${file} completed successfully`);
      }
    } catch (err) {
      console.error(`Failed to run ${file}:`, err);
    }
  }

  console.log('✅ All staging migrations completed!');
}

runMigration().catch(console.error);
