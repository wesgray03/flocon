require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  const sqlPath = path.join(
    __dirname,
    '2025-11-14-add-auto-number-to-change-orders.sql'
  );
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log(
    'Running migration: 2025-11-14-add-auto-number-to-change-orders.sql\n'
  );

  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  console.log('✅ Migration completed successfully');
  console.log('Result:', data);
}

runMigration();
