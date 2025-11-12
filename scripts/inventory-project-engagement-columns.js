require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = `
WITH col AS (
  SELECT table_schema,
         table_name,
         column_name
  FROM information_schema.columns
  WHERE table_schema='public'
    AND column_name IN ('project_id','engagement_id')
)
SELECT table_name,
       string_agg(column_name, ', ' ORDER BY column_name) AS cols
FROM col
GROUP BY table_name
ORDER BY table_name;
`;

async function main() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error('Error:', error);
      return;
    }
    console.log('Tables containing project_id or engagement_id:');
    console.log(JSON.stringify(data, null, 2));
    // Allow process to exit naturally to avoid libuv assertion on Windows
  } catch (e) {
    console.error(e);
    // Allow process to exit naturally
  }
}

main();
