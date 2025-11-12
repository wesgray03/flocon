// run-probability-migration.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw'
);

async function runMigration() {
  console.log('Running probability_level_id migration...\n');

  const migrationPath = path.join(
    __dirname,
    'db',
    'migrations',
    '2025-11-13-add-probability-level-fk.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  const { error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }

  console.log('✅ Migration completed successfully!');
}

runMigration();
