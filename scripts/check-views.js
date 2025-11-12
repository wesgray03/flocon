require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = `
SELECT viewname, definition 
FROM pg_views 
WHERE schemaname = 'public' 
  AND (viewname LIKE '%dashboard%' OR definition ILIKE '%company_id%')
ORDER BY viewname;
`;

supabase
  .rpc('exec_sql', { sql })
  .then((r) => {
    console.log(JSON.stringify(r, null, 2));
  })
  .catch(console.error);
