require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
  process.exit(1);
}

const supabase = createClient(url, key);

(async () => {
  console.log('Verifying legacy columns absence in engagements...');
  const columns = [
    'company_id',
    'contact_id',
    'architect_id',
    'sales_contact_id',
    'project_manager_id',
  ];
  for (const col of columns) {
    const { data, error } = await supabase
      .from('engagements')
      .select(col)
      .limit(1);
    if (error) {
      console.log(`Column ${col}: NOT PRESENT (error: ${error.message})`);
    } else {
      const keys = data && data.length > 0 ? Object.keys(data[0]) : [];
      console.log(
        `Column ${col}: ${keys.includes(col) ? 'PRESENT' : 'NOT PRESENT'}`
      );
    }
  }
})();
