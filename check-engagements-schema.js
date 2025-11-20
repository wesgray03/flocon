require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
  console.log('Checking engagements table schema...\n');

  // Try to select a single row to see columns
  const { data, error } = await supabase
    .from('engagements')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in engagements table:');
    console.log(Object.keys(data[0]).sort().join('\n'));
  } else {
    console.log('No data found, trying to get columns from empty result...');
    // Try with columns we know should exist
    const { data: cols, error: err } = await supabase
      .from('engagements')
      .select('id,name,type,active,lost_reason_id,probability')
      .limit(1);

    if (err) {
      console.error('Error checking specific columns:', err.message);
      console.error('Details:', err);
    } else {
      console.log('Successfully queried columns');
    }
  }
}

checkSchema()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
