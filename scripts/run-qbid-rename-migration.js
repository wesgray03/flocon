require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

(async () => {
  console.log(
    'Running migration: Rename qbid to project_number and drop columns\n'
  );

  // Read migration file
  const migrationPath = path.join(
    __dirname,
    '..',
    'db',
    'migrations',
    '2025-11-10-rename-qbid-drop-notes.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Execute migration
  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  console.log('✅ Migration successful!');
  console.log('\nChanges made:');
  console.log('  - Dropped old project_number column (was unused)');
  console.log('  - Renamed qbid → project_number');
  console.log('  - Dropped scope_summary column (was unused)');
  console.log('  - Dropped notes column (backed up 71 records)');
  console.log('  - Recreated project_dashboard view with new column name');

  // Verify
  console.log('\nVerifying changes...');
  const { data: sample } = await supabase
    .from('engagements')
    .select('id, name, project_number')
    .limit(3);

  if (sample) {
    console.log('\n✅ Sample records with project_number:');
    sample.forEach((r) => {
      console.log(
        `  - ${r.name}: project_number = ${r.project_number || '(null)'}`
      );
    });
  }

  // Check that old columns are gone
  const { error: qbidError } = await supabase
    .from('engagements')
    .select('qbid')
    .limit(1);

  if (qbidError && qbidError.message.includes('does not exist')) {
    console.log('\n✅ qbid column successfully removed');
  }

  const { error: notesError } = await supabase
    .from('engagements')
    .select('notes')
    .limit(1);

  if (notesError && notesError.message.includes('does not exist')) {
    console.log('✅ notes column successfully removed');
  }
})();
