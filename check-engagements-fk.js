// Script to check foreign keys on engagements table
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Checking foreign keys on engagements table...');

  const sql = `
SELECT
    con.conname AS constraint_name,
    att.attname AS column_name,
    cl.relname AS foreign_table,
    att2.attname AS foreign_column
FROM pg_constraint con
JOIN pg_class cl ON con.confrelid = cl.oid
JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
JOIN pg_attribute att2 ON att2.attnum = ANY(con.confkey) AND att2.attrelid = con.confrelid
WHERE con.conrelid = 'public.engagements'::regclass
  AND con.contype = 'f'
ORDER BY con.conname;
`;

  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Foreign keys found:');
    console.log(JSON.stringify(data, null, 2));
  }

  // Also check if user_id column exists
  console.log('\nChecking engagements columns...');
  const colSql = `
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'engagements'
  AND column_name LIKE '%user%'
ORDER BY column_name;
`;

  const { data: colData, error: colError } = await supabase.rpc('exec_sql', {
    sql: colSql,
  });

  if (colError) {
    console.error('❌ Error:', colError);
  } else {
    console.log('✅ User-related columns:');
    console.log(JSON.stringify(colData, null, 2));
  }
}

run();
