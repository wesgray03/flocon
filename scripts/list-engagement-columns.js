require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = `
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'engagements'
ORDER BY ordinal_position;
`;

supabase
  .rpc('exec_sql', { sql })
  .then((r) => {
    console.log('Engagements table columns:');
    console.log(JSON.stringify(r, null, 2));
  })
  .catch(console.error);
