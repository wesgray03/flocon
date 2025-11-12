/**
 * Run Prospects Migration Script
 * 
 * This script runs all prospect-related migrations in the correct order.
 * It connects to your Supabase database and executes the SQL files.
 * 
 * Usage:
 *   node run-prospects-migration.js [staging|production]
 * 
 * Examples:
 *   node run-prospects-migration.js staging     # Run on staging (default)
 *   node run-prospects-migration.js production  # Run on production
 * 
 * Prerequisites:
 *   npm install @supabase/supabase-js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Environment selection
const environment = process.argv[2] || 'staging';

// Supabase configuration
const ENVIRONMENTS = {
  staging: {
    url: 'https://hieokzpxehyelhbubbpb.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1ODQsImV4cCI6MjA3ODAzMTU4NH0.NDXes_vCvs9ocgJcc4BXqFXe68SUjRkBz_wEqvprLVo'
  },
  production: {
    url: 'https://groxqyaoavmfvmaymhbe.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzgxNTMsImV4cCI6MjA3NzI1NDE1M30.SQ2G5gRVn2Zlo1q7j1faxq5ZPAZgphzzBY6XFh3Ovw4'
  }
};

const config = ENVIRONMENTS[environment];
if (!config) {
  console.error(`❌ Invalid environment: ${environment}`);
  console.error('   Valid options: staging, production');
  process.exit(1);
}

const supabase = createClient(config.url, config.key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migration files in order
const MIGRATIONS = [
  '2025-11-09-create-trades-table.sql',
  '2025-11-09-convert-projects-to-engagements.sql',
  '2025-11-09-create-engagement-trades.sql',
  '2025-11-09-create-prospect-promotion-functions.sql',
  '2025-11-09-create-prospect-project-views.sql',
  '2025-11-09-setup-engagements-rls.sql'
];

const MIGRATIONS_DIR = path.join(__dirname, 'db', 'migrations');

/**
 * Ask for user confirmation
 */
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Read SQL file content
 */
function readMigrationFile(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Migration file not found: ${filepath}`);
  }
  return fs.readFileSync(filepath, 'utf8');
}

/**
 * Execute SQL migration using the exec_sql RPC function
 */
async function runMigration(filename) {
  console.log(`\n📄 Running: ${filename}`);
  
  try {
    const sql = readMigrationFile(filename);
    
    // Use the exec_sql RPC function (must be created in Supabase first)
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      // If exec_sql doesn't exist, provide helpful message
      if (error.message.includes('function public.exec_sql')) {
        console.error('\n❌ The exec_sql helper function is not set up in Supabase.');
        console.error('\n📋 To fix this:');
        console.error('   1. Go to Supabase SQL Editor');
        console.error('   2. Run: db/migrations/0000-setup-exec-sql-helper.sql');
        console.error('   3. Try running this script again\n');
        throw new Error('exec_sql function not found');
      }
      throw error;
    }
    
    console.log(`   ✅ Success`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    throw error;
  }
}

/**
 * Check if migration has already been run
 */
async function checkMigrationHistory(filename) {
  const { data, error } = await supabase
    .from('migration_history')
    .select('id')
    .eq('migration_name', filename)
    .single();
  
  return !error && data;
}

/**
 * Record migration in history
 */
async function recordMigration(filename) {
  const { error } = await supabase
    .from('migration_history')
    .insert({
      migration_name: filename,
      applied_at: new Date().toISOString()
    });
  
  if (error && !error.message.includes('does not exist')) {
    console.warn(`   ⚠️  Could not record migration history: ${error.message}`);
  }
}

/**
 * Main migration runner
 */
async function runMigrations() {
  console.log('🚀 Starting Prospects Migration');
  console.log('================================\n');
  
  console.log(`📍 Environment: ${environment.toUpperCase()}`);
  console.log(`📍 Supabase URL: ${config.url}`);
  console.log(`📁 Migrations directory: ${MIGRATIONS_DIR}\n`);
  
  // Safety confirmation for production
  if (environment === 'production') {
    console.log('⚠️  WARNING: You are about to run migrations on PRODUCTION!');
    const confirmed = await askConfirmation('Are you sure you want to continue? (yes/no): ');
    if (!confirmed) {
      console.log('❌ Aborted by user');
      process.exit(0);
    }
  }
  
  let successCount = 0;
  let skippedCount = 0;
  
  for (const migration of MIGRATIONS) {
    try {
      // Check if already run
      const alreadyRun = await checkMigrationHistory(migration);
      if (alreadyRun) {
        console.log(`\n⏭️  Skipping (already run): ${migration}`);
        skippedCount++;
        continue;
      }
      
      // Run migration
      await runMigration(migration);
      
      // Record in history
      await recordMigration(migration);
      
      successCount++;
      
    } catch (error) {
      console.error(`\n❌ Migration failed: ${migration}`);
      console.error(`   Error: ${error.message}`);
      console.error('\n⚠️  Stopping migrations to prevent cascading failures.');
      console.error('   Fix the error and run again to continue.');
      process.exit(1);
    }
  }
  
  console.log('\n================================');
  console.log('✅ Migration Complete!');
  console.log(`   ${successCount} migrations applied`);
  console.log(`   ${skippedCount} migrations skipped (already run)`);
  console.log('\n📋 Next Steps:');
  console.log('   1. Verify data in Supabase dashboard');
  console.log('   2. Test creating a prospect');
  console.log('   3. Test promoting prospect to project');
  console.log('   4. Update user roles (Sales vs Ops)');
  console.log('   5. Build Prospects UI\n');
}

/**
 * Verification queries to run after migration
 */
async function runVerification() {
  console.log('\n🔍 Running Verification Checks...\n');
  
  // Check engagements table exists
  const { data: engagements, error: engError } = await supabase
    .from('engagements')
    .select('id, type')
    .limit(5);
  
  if (engError) {
    console.error('❌ engagements table not accessible:', engError.message);
  } else {
    console.log(`✅ engagements table OK (${engagements.length} records found)`);
  }
  
  // Check trades table
  const { data: trades, error: tradesError } = await supabase
    .from('trades')
    .select('code, name')
    .limit(5);
  
  if (tradesError) {
    console.error('❌ trades table not accessible:', tradesError.message);
  } else {
    console.log(`✅ trades table OK (${trades.length} trades seeded)`);
    if (trades.length > 0) {
      console.log(`   Example: ${trades[0].code} - ${trades[0].name}`);
    }
  }
  
  // Check views
  const { data: prospects, error: prospectsError } = await supabase
    .from('v_prospects')
    .select('id')
    .limit(1);
  
  if (prospectsError) {
    console.error('❌ v_prospects view not accessible:', prospectsError.message);
  } else {
    console.log('✅ v_prospects view OK');
  }
  
  const { data: projects, error: projectsError } = await supabase
    .from('v_projects')
    .select('id')
    .limit(1);
  
  if (projectsError) {
    console.error('❌ v_projects view not accessible:', projectsError.message);
  } else {
    console.log('✅ v_projects view OK');
  }
  
  console.log('\n✅ Verification complete!');
}

// Run the migrations
runMigrations()
  .then(() => runVerification())
  .then(() => {
    console.log('\n🎉 All done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
