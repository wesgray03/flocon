// Check the actual view definition
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkView() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_string: `
      SELECT pg_get_viewdef('project_dashboard'::regclass, true) as definition;
    `,
  });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Current view definition:');
    console.log(data[0].definition);
  }
}

checkView().then(() => process.exit(0));
