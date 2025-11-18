#!/usr/bin/env node
/**
 * Run QuickBooks migrations on production database
 * Simple approach using direct SQL execution
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
  'db/migrations/2025-11-17-create-qbo-tokens-table.sql',
  'db/migrations/2025-11-17-add-qbo-id-columns.sql',
  'db/migrations/2025-11-17-add-qbo-columns-to-pay-apps.sql',
  '2025-11-17-add-qbo-columns-to-companies.sql',
  '2025-11-18-create-qbo-vendor-import-list.sql',
];

async function runMigrations() {
  console.log('🚀 Running QuickBooks migrations on PRODUCTION');
  console.log(`📊 Database: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`📝 Total migrations: ${migrations.length}\n`);

  console.log('⚠️  WARNING: This will modify your PRODUCTION database!');
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  for (const migration of migrations) {
    const fileName = path.basename(migration);
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Running: ${fileName}`);
    console.log('='.repeat(70));

    const filePath = path.join(__dirname, migration);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf-8');

    // Split by semicolons but keep multi-line statements together
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter(
        (s) => s && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT'
      );

    for (const statement of statements) {
      if (!statement) continue;

      try {
        const { error } = await supabase.rpc('exec', { sql: statement });

        if (error) {
          console.error(`❌ Error: ${error.message}`);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
        }
      } catch (err) {
        // Ignore "already exists" errors
        if (
          err.message &&
          (err.message.includes('already exists') ||
            err.message.includes('duplicate'))
        ) {
          console.log(`⚠️  Already exists, skipping...`);
        } else {
          console.error(`❌ Error: ${err.message}`);
        }
      }
    }

    console.log(`✅ Completed ${fileName}`);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('🎉 All migrations processed!');
  console.log('='.repeat(70));
}

runMigrations().catch(console.error);
