require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = `
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name IN ('project_id', 'engagement_id') 
AND table_schema='public' 
ORDER BY table_name, column_name
`;

supabase.rpc('exec_sql', { sql }).then((r) => {
  if (r.error) {
    console.error('Error:', r.error);
  } else {
    console.log(JSON.stringify(r.data, null, 2));
  }
  process.exit(r.error ? 1 : 0);
});
