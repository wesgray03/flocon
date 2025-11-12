require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
  process.exit(1);
}

const supabase = createClient(url, key);

(async () => {
  console.log('Checking engagements table columns...\n');

  // Check if notes and scope_summary have data
  const { data, error } = await supabase
    .from('engagements')
    .select('id, name, project_number, qbid, notes, scope_summary')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample records:');
  data.forEach((r) => {
    console.log(`\n${r.name}:`);
    console.log(`  project_number: ${r.project_number || '(null)'}`);
    console.log(`  qbid: ${r.qbid || '(null)'}`);
    console.log(
      `  notes: ${r.notes ? r.notes.substring(0, 50) + '...' : '(null)'}`
    );
    console.log(
      `  scope_summary: ${r.scope_summary ? r.scope_summary.substring(0, 50) + '...' : '(null)'}`
    );
  });

  // Count non-null values
  const { data: allData } = await supabase
    .from('engagements')
    .select('project_number, qbid, notes, scope_summary');

  if (allData) {
    const projectNumberCount = allData.filter((r) => r.project_number).length;
    const qbidCount = allData.filter((r) => r.qbid).length;
    const notesCount = allData.filter((r) => r.notes).length;
    const scopeCount = allData.filter((r) => r.scope_summary).length;

    console.log(
      `\n\nColumn usage summary (out of ${allData.length} total records):`
    );
    console.log(`  project_number: ${projectNumberCount} records have values`);
    console.log(`  qbid: ${qbidCount} records have values`);
    console.log(`  notes: ${notesCount} records have values`);
    console.log(`  scope_summary: ${scopeCount} records have values`);
  }
})();
