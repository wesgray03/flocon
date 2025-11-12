const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Environment configuration
const environments = {
  staging: {
    url: 'https://hieokzpxehyelhbubbpb.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1ODQsImV4cCI6MjA3ODAzMTU4NH0.NDXes_vCvs9ocgJcc4BXqFXe68SUjRkBz_wEqvprLVo',
  },
  production: {
    url: 'https://groxqyaoavmfvmaymhbe.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzgxNTMsImV4cCI6MjA3NzI1NDE1M30.SQ2G5gRVn2Zlo1q7j1faxq5ZPAZgphzzBY6XFh3Ovw4',
  },
};

async function initMigrationTable(supabase) {
  console.log('Ensuring migration tracking table exists...');

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS migration_history (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW(),
      checksum TEXT
    );
  `;

  const { error } = await supabase.rpc('exec_sql', {
    sql: createTableSQL,
  });
  if (error) {
    console.error('Error creating migration table:', error);
    return false;
  }
  return true;
}

async function getExecutedMigrations(supabase) {
  const { data, error } = await supabase
    .from('migration_history')
    .select('filename')
    .order('executed_at');

  if (error) {
    console.error('Error getting migration history:', error);
    return [];
  }

  return data.map((row) => row.filename);
}

async function recordMigration(supabase, filename, checksum) {
  const { error } = await supabase
    .from('migration_history')
    .insert({ filename, checksum });

  if (error) {
    console.error('Error recording migration:', error);
  }
}

function calculateChecksum(content) {
  // Simple checksum for verification
  return content.length.toString(16);
}

async function runMigrations(environment) {
  const env = environments[environment];
  if (!env) {
    console.error(`Unknown environment: ${environment}`);
    console.log(
      'Available environments:',
      Object.keys(environments).join(', ')
    );
    process.exit(1);
  }

  console.log(
    `🚀 Running migrations for ${environment.toUpperCase()} environment`
  );
  console.log(`📍 Database: ${env.url}`);

  const supabase = createClient(env.url, env.key);

  // Initialize migration tracking
  const initSuccess = await initMigrationTable(supabase);
  if (!initSuccess) {
    process.exit(1);
  }

  // Get already executed migrations
  const executedMigrations = await getExecutedMigrations(supabase);
  console.log(`📋 ${executedMigrations.length} migrations already executed`);

  // Get all migration files
  const migrationPath = path.join(__dirname, 'db', 'migrations');
  const files = fs
    .readdirSync(migrationPath)
    .filter((file) => file.endsWith('.sql'))
    .filter(
      (file) =>
        !file.startsWith('NUCLEAR') &&
        !file.startsWith('README') &&
        !file.startsWith('FIX-') &&
        !file.startsWith('CLEAN-') &&
        !file.startsWith('0-inspect') &&
        !file.startsWith('OPTIMIZED')
    )
    .sort();

  console.log(`📁 Found ${files.length} migration files`);

  let newMigrations = 0;

  for (const file of files) {
    if (executedMigrations.includes(file)) {
      console.log(`⏭️  Skipping ${file} (already executed)`);
      continue;
    }

    console.log(`🔄 Executing ${file}...`);

    try {
      const sql = fs.readFileSync(path.join(migrationPath, file), 'utf8');
      const checksum = calculateChecksum(sql);

      const { error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        console.error(`❌ Error in ${file}:`, error);
        process.exit(1);
      }

      // Record successful migration
      await recordMigration(supabase, file, checksum);
      console.log(`✅ ${file} completed successfully`);
      newMigrations++;
    } catch (err) {
      console.error(`💥 Failed to run ${file}:`, err);
      process.exit(1);
    }
  }

  if (newMigrations === 0) {
    console.log(`🎉 Database is up to date! No new migrations to run.`);
  } else {
    console.log(`🎉 Successfully executed ${newMigrations} new migration(s)!`);
  }

  console.log(
    `📊 Total migrations in database: ${executedMigrations.length + newMigrations}`
  );
}

// Command line interface
const environment = process.argv[2];

if (!environment) {
  console.log('Usage: node migrate.js <environment>');
  console.log('Available environments: staging, production');
  process.exit(1);
}

runMigrations(environment).catch(console.error);
