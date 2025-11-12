// Get the actual schema of engagements table
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Fetching engagements table schema...\n');

  const { data, error } = await supabase
    .from('engagements')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Error:', error);
    return;
  }

  if (data) {
    const columns = Object.keys(data).sort();
    console.log('✅ Engagements table columns:');
    columns.forEach((col) => {
      const value = data[col];
      const type = value === null ? 'NULL' : typeof value;
      console.log(`  - ${col}: ${type} = ${JSON.stringify(value)}`);
    });

    console.log('\n\nColumn names only (for easy copying):');
    console.log(columns.join(', '));
  } else {
    console.log('No data in engagements table');
  }
}

run();
