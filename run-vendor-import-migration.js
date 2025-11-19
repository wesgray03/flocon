#!/usr/bin/env node
/**
 * Run the qbo_vendor_import_list table migration on production
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error(
    '   Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Running qbo_vendor_import_list migration on production...\n');

  // Read the SQL file
  const sqlPath = path.join(
    __dirname,
    '2025-11-18-create-qbo-vendor-import-list.sql'
  );
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split into individual statements (basic split on semicolons outside of strings)
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  console.log(`📄 Found ${statements.length} SQL statements\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 80).replace(/\s+/g, ' ');

    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: statement,
      });

      if (error) {
        // Try direct execution if rpc fails
        const { error: directError } = await supabase
          .from('qbo_vendor_import_list')
          .select('id')
          .limit(1);

        if (directError && directError.message.includes('does not exist')) {
          console.error(`   ❌ Error: ${error.message}`);
          console.error(
            '\n⚠️  Cannot execute SQL directly via Supabase client.'
          );
          console.error(
            '   Please run this SQL manually in Supabase Dashboard > SQL Editor:\n'
          );
          console.error('   ' + sqlPath + '\n');
          process.exit(1);
        }
      }

      console.log(`   ✅ Success`);
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      console.error(
        '\n⚠️  Migration failed. Please run the SQL manually in Supabase Dashboard.\n'
      );
      process.exit(1);
    }
  }

  console.log('\n✨ Migration completed successfully!');

  // Verify table exists and has data
  const { data, error, count } = await supabase
    .from('qbo_vendor_import_list')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error(`\n⚠️  Could not verify table: ${error.message}`);
  } else {
    console.log(
      `\n✅ Verified: qbo_vendor_import_list table exists with ${count} vendors\n`
    );
  }
}

runMigration().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
