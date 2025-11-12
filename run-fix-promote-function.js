// Script to fix the promote_prospect_to_project function
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Fixing promote_prospect_to_project function...');

  const sqlFile = fs.readFileSync(
    'db/migrations/2025-11-11-fix-promote-function-actual-columns.sql',
    'utf8'
  );

  // Remove BEGIN/COMMIT for exec_sql
  const sql = sqlFile
    .replace(/BEGIN;/g, '')
    .replace(/COMMIT;/g, '')
    .trim();

  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } else {
    console.log(
      '✅ Successfully updated promote_prospect_to_project function!'
    );
    console.log('   - Removed customer_id column validation');
    console.log('   - Now checks engagement_parties for customer role');
  }
}

run();
