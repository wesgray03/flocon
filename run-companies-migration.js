// Run QB columns migration for companies table directly
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('Renaming qbo_customer_id to qbo_id...\n');

  const statements = [
    {
      name: 'Rename qbo_customer_id column to qbo_id',
      sql: 'ALTER TABLE companies RENAME COLUMN qbo_customer_id TO qbo_id',
    },
    {
      name: 'Drop old index',
      sql: 'DROP INDEX IF EXISTS idx_companies_qbo_customer_id',
    },
    {
      name: 'Create index on qbo_id',
      sql: 'CREATE INDEX IF NOT EXISTS idx_companies_qbo_id ON companies(qbo_id) WHERE qbo_id IS NOT NULL',
    },
  ];

  for (const statement of statements) {
    console.log(`Executing: ${statement.name}`);
    const { error } = await supabase.rpc('exec_sql', { sql: statement.sql });

    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✓ Success`);
    }
  }

  console.log('\nMigration complete!');
}

runMigration();
