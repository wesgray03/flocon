const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// REPLACE THESE WITH YOUR STAGING PROJECT CREDENTIALS
const supabaseUrl = 'https://YOUR_STAGING_PROJECT_REF.supabase.co';
const supabaseKey = 'YOUR_STAGING_ANON_KEY';

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
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
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
