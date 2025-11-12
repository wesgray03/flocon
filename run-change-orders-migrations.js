// Script to run change_orders migrations
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration(filePath, description) {
  console.log(`\n📝 Running: ${description}`);
  console.log(`   File: ${filePath}`);

  const sql = fs.readFileSync(filePath, 'utf8');

  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('❌ Error:', error);
    throw error;
  } else {
    console.log('✅ Success!');
    return data;
  }
}

async function run() {
  try {
    console.log('🚀 Starting change_orders migrations...\n');

    // Migration 1: Recreate change_orders table
    await runMigration(
      path.join(
        __dirname,
        'db',
        'migrations',
        '2025-11-10-recreate-change-orders.sql'
      ),
      'Recreate change_orders table with new structure'
    );

    // Migration 2: Update project_dashboard view
    await runMigration(
      path.join(
        __dirname,
        'db',
        'migrations',
        '2025-11-10-update-dashboard-after-co-restructure.sql'
      ),
      'Update project_dashboard view'
    );

    console.log('\n🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  }
}

run();
