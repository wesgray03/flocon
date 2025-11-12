// Verify columns were removed by querying information_schema
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

const checkSQL = `
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'engagements'
  AND column_name IN ('company_id', 'contact_id', 'architect_id', 'sales_contact_id', 'project_manager_id')
ORDER BY column_name;
`;

(async () => {
  console.log('🔍 Checking for legacy columns in engagements table...');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: checkSQL });

    if (error) {
      console.error('Error:', error);
      process.exit(1);
    }

    console.log('Query result:', data);

    if (!data || data === 'Success') {
      // Try alternate method - query the table directly and check if columns exist
      console.log('\n📋 Attempting to select legacy columns...');
      const { data: testData, error: testError } = await supabase
        .from('engagements')
        .select(
          'company_id, contact_id, architect_id, sales_contact_id, project_manager_id'
        )
        .limit(1);

      if (testError) {
        if (
          testError.message.includes('column') ||
          testError.code === '42703'
        ) {
          console.log(
            '✅ Legacy columns successfully removed! (Select query failed as expected)'
          );
        } else {
          console.log('❓ Unexpected error:', testError);
        }
      } else {
        console.log('⚠️  Columns still present - select succeeded');
        console.log('Sample data:', testData);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
})();
