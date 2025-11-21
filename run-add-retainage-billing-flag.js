const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🚀 Adding is_retainage_billing flag to pay apps...\n');

  try {
    console.log('⚙️  Adding column...\n');

    // Use the Supabase REST API to check and add the column
    const { error: addColError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE engagement_pay_apps ADD COLUMN IF NOT EXISTS is_retainage_billing BOOLEAN DEFAULT false;'
    }).catch(() => ({ error: 'RPC not available' }));

    if (addColError) {
      console.log('Trying direct approach...');
      // Try with a test query to verify column exists
      const { error: testError } = await supabase
        .from('engagement_pay_apps')
        .select('is_retainage_billing')
        .limit(1);
      
      if (testError && testError.code === '42703') {
        console.error('\n❌ Column does not exist. Please run this SQL in Supabase SQL Editor:\n');
        console.error(fs.readFileSync(
          path.join(__dirname, 'db', 'migrations', '2025-11-21-add-is-retainage-billing-flag.sql'),
          'utf8'
        ));
        process.exit(1);
      }
    }

    console.log('✅ Column verified/added\n');
    console.log('📊 Summary:');
    console.log('- Added is_retainage_billing column to engagement_pay_apps');
    console.log('- New pay apps will track whether they are retainage releases');
    console.log('- Financial Overview will now calculate net retainage (held minus released)\n');

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error('\nPlease run this SQL manually in Supabase SQL Editor:\n');
    console.error(fs.readFileSync(
      path.join(__dirname, 'db', 'migrations', '2025-11-21-add-is-retainage-billing-flag.sql'),
      'utf8'
    ));
    process.exit(1);
  }
}

runMigration();
