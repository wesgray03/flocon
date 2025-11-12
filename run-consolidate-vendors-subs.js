// Script to consolidate vendors and subcontractors into companies table
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log(
    '🔄 Consolidating vendors and subcontractors into companies table...\n'
  );

  const sqlFile = fs.readFileSync(
    'db/migrations/2025-11-11-consolidate-vendors-subs-to-companies.sql',
    'utf8'
  );

  // Remove BEGIN/COMMIT for exec_sql
  const sql = sqlFile
    .replace(/BEGIN;/g, '')
    .replace(/COMMIT;/g, '')
    .replace(/-- .*$/gm, '') // Remove single-line comments
    .trim();

  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } else {
    console.log('✅ Successfully consolidated vendors and subcontractors!\n');
    console.log('📋 Changes made:');
    console.log('   1. ✅ Added Vendor and Subcontractor to company_type enum');
    console.log(
      '   2. ✅ Added is_vendor and is_subcontractor flags to companies'
    );
    console.log('   3. ✅ Created company_vendor_details extension table');
    console.log(
      '   4. ✅ Created company_subcontractor_details extension table'
    );
    console.log('   5. ✅ Dropped old vendors and subcontractors tables');
    console.log('   6. ✅ Created new engagement_subcontractors table');
    console.log('   7. ✅ Created vendors_view and subcontractors_view\n');
    console.log('💡 Next steps:');
    console.log('   - Use vendors_view to query all vendors');
    console.log('   - Use subcontractors_view to query all subcontractors');
    console.log(
      '   - Companies can now be multiple types (customer + vendor, etc.)'
    );
  }
}

run();
