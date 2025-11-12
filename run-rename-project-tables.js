// Run rename migration for project_* -> engagement_* tables/views
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const fs = require('fs');
const path = require('path');

async function run() {
  const sqlPath = path.join(__dirname, '2025-11-11-rename-project-tables.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('Renaming legacy project_* tables/views to engagement_* ...');
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('❌ Rename failed:', error);
    process.exitCode = 1;
  } else {
    console.log('✅ Rename complete');
    console.log(data);
  }
}

run();
