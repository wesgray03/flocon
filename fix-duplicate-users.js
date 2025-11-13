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

async function runMigration() {
  console.log('🚀 Fixing duplicate user creation on login\n');

  const migration = {
    file: '2025-11-13-fix-duplicate-user-creation.sql',
    description: 'Fix duplicate user creation by checking email as well as auth_user_id',
  };

  console.log(`\n📝 Running: ${migration.description}`);
  console.log(`   File: ${migration.file}`);

  const migrationPath = path.join(
    __dirname,
    'db',
    'migrations',
    migration.file
  );

  const sql = fs.readFileSync(migrationPath, 'utf8');

  const { data, error} = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error(`❌ Migration failed:`, error);
    process.exit(1);
  }

  console.log(`✅ Success!`);
  console.log('\n🎉 Migration completed successfully!');
  console.log('\nChanges applied:');
  console.log('  ✅ Updated handle_new_user() function to check by email');
  console.log('  ✅ Will now update auth_user_id if user exists by email');
  console.log('  ✅ Prevents duplicate user records on login');
}

runMigration();
