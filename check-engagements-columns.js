require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkColumns() {
  console.log('Checking engagements table columns...\n');
  
  const { data, error } = await supabase
    .from('engagements')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log('Columns in engagements table:');
    columns.sort().forEach(col => {
      console.log(`  - ${col}`);
    });
    
    // Check if manager is a text field
    console.log('\nSample manager values:');
    const { data: samples } = await supabase
      .from('engagements')
      .select('id, name, manager')
      .not('manager', 'is', null)
      .limit(5);
    
    if (samples) {
      samples.forEach(s => {
        console.log(`  ${s.name}: "${s.manager}" (type: ${typeof s.manager})`);
      });
    }
  }
}

checkColumns();
