// Check the current engagement_dashboard view definition
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkView() {
  // Query the view to see what columns it has
  const { data, error } = await supabase
    .from('engagement_dashboard')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Engagement Dashboard columns:');
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
      console.log('\nHas "owner" column?', 'owner' in data[0]);
      console.log('Has "project_lead" column?', 'project_lead' in data[0]);
    } else {
      console.log('No data found');
    }
  }
}
checkView();
