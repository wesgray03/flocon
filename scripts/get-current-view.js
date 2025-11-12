import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
});

async function getCurrentView() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: "SELECT pg_get_viewdef('project_dashboard', true);",
    });

    if (error) {
      console.error('❌ Query failed:', error);
      process.exit(1);
    }

    console.log('Current project_dashboard view definition:');
    console.log(data[0]?.pg_get_viewdef || data);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

getCurrentView();
