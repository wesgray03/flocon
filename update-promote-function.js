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
  console.log('🚀 Running on PRODUCTION');
} else {
  const stagingEnv = fs.readFileSync('.env.local', 'utf8');
  supabaseUrl = stagingEnv.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
  supabaseKey = stagingEnv.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();
  console.log('🧪 Running on STAGING');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePromoteFunction() {
  const migrationPath = path.join(
    __dirname,
    'db',
    'migrations',
    '2025-11-11-fix-promote-function-actual-columns.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Updating promote_prospect_to_project function...\n');

  const { data, error } = await supabase.rpc('exec_sql', { sql: sql });

  if (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }

  console.log('✅ Function updated successfully!');
  console.log(
    'The promote_prospect_to_project function now uses probability_level_id'
  );
}

updatePromoteFunction();
