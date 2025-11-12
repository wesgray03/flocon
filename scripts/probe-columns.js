require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const checks = [
  { table: 'sov_lines', cols: ['project_id', 'engagement_id'] },
  { table: 'pay_apps', cols: ['project_id', 'engagement_id'] },
  { table: 'change_orders', cols: ['project_id', 'engagement_id'] },
  { table: 'project_comments', cols: ['project_id', 'engagement_id'] },
  { table: 'project_subcontractors', cols: ['project_id', 'engagement_id'] },
  { table: 'project_task_completion', cols: ['project_id', 'engagement_id'] },
  { table: 'project_tasks', cols: ['project_id', 'engagement_id'] },
];

(async () => {
  const results = [];
  for (const { table, cols } of checks) {
    const row = { table };
    for (const col of cols) {
      try {
        const { error } = await supabase
          .from(table)
          .select(`id, ${col}`)
          .limit(1);
        row[col] = error ? false : true;
      } catch (e) {
        row[col] = false;
      }
    }
    results.push(row);
  }
  console.log(JSON.stringify(results, null, 2));
})();
