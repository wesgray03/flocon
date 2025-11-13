const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Determine which environment to use
const isProduction = process.argv.includes('--prod');

let supabaseUrl, supabaseKey;

if (isProduction) {
  const prodEnv = fs.readFileSync('.env.production.local', 'utf8');
  supabaseUrl = prodEnv.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
  supabaseKey = prodEnv.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();
  console.log('🚀 Running migration on PRODUCTION');
} else {
  const stagingEnv = fs.readFileSync('.env.local', 'utf8');
  supabaseUrl = stagingEnv.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
  supabaseKey = stagingEnv.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();
  console.log('🧪 Running migration on STAGING');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  const migrationPath = path.join(
    __dirname,
    'db',
    'migrations',
    '2025-11-12-drop-bid-amount-column.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Running migration: 2025-11-12-drop-bid-amount-column.sql');
  console.log('This will drop the bid_amount column from engagements table\n');

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  console.log('✅ Migration completed successfully!');
  if (data) console.log('Result:', data);
}

runMigration();
