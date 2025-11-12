// Script to add RLS policies for engagement_subcontractors table
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runMigration() {
  try {
    console.log('🔄 Adding RLS policies for engagement_subcontractors...\n');

    const sql = fs.readFileSync(
      path.join(
        __dirname,
        'db/migrations/2025-11-11-add-engagement-subcontractors-rls.sql'
      ),
      'utf8'
    );

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sql,
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Successfully added RLS policies!\n');
    console.log('📋 Changes made:');
    console.log('   1. ✅ Enabled RLS on engagement_subcontractors');
    console.log('   2. ✅ Added SELECT, INSERT, UPDATE, DELETE policies');
    console.log('   3. ✅ Enabled RLS on company_vendor_details');
    console.log('   4. ✅ Enabled RLS on company_subcontractor_details');
    console.log(
      '   5. ✅ Added policies for vendor and subcontractor detail tables'
    );

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

runMigration();
