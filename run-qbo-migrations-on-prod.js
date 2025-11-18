#!/usr/bin/env node
/**
 * Run QuickBooks migrations on production database
 * Date: 2025-11-18
 *
 * Migrations to run:
 * 1. Create qbo_tokens table
 * 2. Add QB columns to engagements table
 * 3. Add QB columns to engagement_pay_apps table
 * 4. Add QB columns to companies table
 */

require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const migrations = [
  {
    name: '2025-11-17-create-qbo-tokens-table.sql',
    path: 'db/migrations/2025-11-17-create-qbo-tokens-table.sql',
  },
  {
    name: '2025-11-17-add-qbo-id-columns.sql',
    path: 'db/migrations/2025-11-17-add-qbo-id-columns.sql',
  },
  {
    name: '2025-11-17-add-qbo-columns-to-pay-apps.sql',
    path: 'db/migrations/2025-11-17-add-qbo-columns-to-pay-apps.sql',
  },
  {
    name: '2025-11-17-add-qbo-columns-to-companies.sql',
    path: '2025-11-17-add-qbo-columns-to-companies.sql',
  },
  {
    name: '2025-11-18-create-qbo-vendor-import-list.sql',
    path: '2025-11-18-create-qbo-vendor-import-list.sql',
  },
];

async function runMigration(migration) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Running: ${migration.name}`);
  console.log('='.repeat(70));

  const filePath = path.join(__dirname, migration.path);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }

  const sql = fs.readFileSync(filePath, 'utf-8');

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      // Try direct query if RPC fails
      const { error: directError } = await supabase.from('_migrations').insert({
        name: migration.name,
        executed_at: new Date().toISOString(),
      });

      // Run the actual SQL
      const { error: sqlError } = await supabase.rpc('exec', { query: sql });

      if (sqlError) {
        console.error(`❌ Error: ${sqlError.message}`);
        console.error(sqlError);
        return false;
      }
    }

    console.log(`✅ Successfully ran ${migration.name}`);
    return true;
  } catch (err) {
    console.error(`❌ Error running ${migration.name}:`, err.message);
    return false;
  }
}

async function runAllMigrations() {
  console.log('🚀 Starting QuickBooks migrations on PRODUCTION');
  console.log(`📊 Database: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`📝 Total migrations: ${migrations.length}\n`);

  // Confirm with user
  console.log('⚠️  WARNING: This will modify your PRODUCTION database!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  await new Promise((resolve) => setTimeout(resolve, 5000));

  let successCount = 0;
  let failCount = 0;

  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📝 Total: ${migrations.length}`);
  console.log('='.repeat(70));

  if (failCount > 0) {
    console.log('\n⚠️  Some migrations failed. Check the errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All migrations completed successfully!');
  }
}

runAllMigrations().catch(console.error);
