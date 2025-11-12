const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Use staging with service role key
const supabase = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ'
);

async function runEngagementPartiesMigration() {
  console.log('🚀 Running engagement_parties migration on STAGING...\n');

  // Read the migration file
  const migrationPath = path.join(
    __dirname,
    'db',
    'migrations',
    '2025-11-10-create-engagement-parties.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file loaded');
  console.log(`📏 SQL size: ${sql.length} characters\n`);

  console.log('⚙️  Executing migration...');
  console.log('⚠️  Note: This may take a moment...\n');

  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      console.error(
        '\n💡 Try running this SQL manually in Supabase SQL Editor:'
      );
      console.error(
        '   https://supabase.com/dashboard/project/hieokzpxehyelhbubbpb/sql'
      );
      process.exit(1);
    }

    console.log('✅ Migration executed successfully!');
    console.log('\n📊 Running verification...\n');

    // Run verification
    const { count } = await supabase
      .from('engagement_parties')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ engagement_parties table created`);
    console.log(`✅ ${count} records migrated\n`);

    console.log('🎉 Migration complete! Run verification script:');
    console.log('   node verify-engagement-parties.js');
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

runEngagementPartiesMigration().catch(console.error);
