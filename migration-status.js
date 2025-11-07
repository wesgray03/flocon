const { createClient } = require('@supabase/supabase-js');

// Environment configuration (same as migrate.js)
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

async function checkMigrationStatus(environment) {
  const env = environments[environment];
  if (!env) {
    console.error(`Unknown environment: ${environment}`);
    process.exit(1);
  }

  console.log(`📊 Migration Status for ${environment.toUpperCase()}`);
  console.log(`📍 Database: ${env.url}\n`);

  const supabase = createClient(env.url, env.key);

  try {
    const { data, error } = await supabase
      .from('migration_history')
      .select('filename, executed_at')
      .order('executed_at');

    if (error) {
      console.error('Error getting migration history:', error);
      process.exit(1);
    }

    if (data.length === 0) {
      console.log('❌ No migrations have been executed yet.');
    } else {
      console.log(`✅ ${data.length} migrations executed:\n`);
      data.forEach((migration, index) => {
        const date = new Date(migration.executed_at).toLocaleString();
        console.log(`${index + 1}. ${migration.filename} (${date})`);
      });
    }
  } catch (err) {
    console.error('Failed to check migration status:', err);
  }
}

const environment = process.argv[2];

if (!environment) {
  console.log('Usage: node migration-status.js <environment>');
  console.log('Available environments: staging, production');
  process.exit(1);
}

checkMigrationStatus(environment);
