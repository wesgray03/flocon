require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('📋 Fetching all columns in engagements table...\n');

  const sql = `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'engagements'
    ORDER BY ordinal_position;
  `;

  const { data: result } = await supabase.rpc('exec_sql', { sql });

  // Also try a direct query to see actual columns
  const { data: sample, error } = await supabase
    .from('engagements')
    .select('*')
    .limit(1);

  if (sample && sample.length > 0) {
    console.log('Actual columns from sample row:');
    Object.keys(sample[0])
      .sort()
      .forEach((col) => {
        console.log(`  - ${col}`);
      });
  }

  console.log('\nResult from information_schema:', result);
})();
