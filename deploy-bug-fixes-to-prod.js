const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Production environment
const prodEnv = fs.readFileSync('.env.production.local', 'utf8');
const supabaseUrl = prodEnv.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseKey = prodEnv
  .match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]
  ?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  console.log('🚀 Running bug fix migrations on PRODUCTION\n');

  const migrations = [
    {
      file: '2025-11-12-replace-dashboard-views-with-thin-views.sql',
      description: 'Create projects_v and prospects_v thin views',
    },
    {
      file: '2025-11-11-fix-promote-function-actual-columns.sql',
      description: 'Update promote_prospect_to_project function',
    },
  ];

  for (const migration of migrations) {
    console.log(`\n📝 Running: ${migration.description}`);
    console.log(`   File: ${migration.file}`);

    const migrationPath = path.join(
      __dirname,
      'db',
      'migrations',
      migration.file
    );

    const sql = fs.readFileSync(migrationPath, 'utf8');

    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error(`❌ Migration failed:`, error);
      process.exit(1);
    }

    console.log(`✅ Success!`);
  }

  console.log('\n\n🎉 All migrations completed successfully!');
  console.log('\nChanges applied:');
  console.log('  ✅ Created projects_v and prospects_v views');
  console.log('  ✅ Updated promote_prospect_to_project function');
  console.log('  ✅ Fixed probability fields (now using probability_level_id)');
  console.log('  ✅ Removed user_id from engagements updates');
}

runMigrations();
