const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://groxqyaoavmfvmaymhbe.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzgxNTMsImV4cCI6MjA3NzI1NDE1M30.SQ2G5gRVn2Zlo1q7j1faxq5ZPAZgphzzBY6XFh3Ovw4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  const migrationPath = path.join(
    __dirname,
    'db',
    'migrations',
    '2025-11-05-migrate-owners-to-users.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Running migration: 2025-11-05-migrate-owners-to-users.sql');

  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  console.log('Migration completed successfully!');
  console.log('Result:', data);
}

runMigration();
