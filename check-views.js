const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const stagingEnv = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = stagingEnv
  .match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]
  ?.trim();
const supabaseKey = stagingEnv
  .match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]
  ?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkViews() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND (table_name LIKE '%project%' OR table_name LIKE '%prospect%')
        ORDER BY table_name;
      `,
    });

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Views in staging:');
    console.log(data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkViews();
