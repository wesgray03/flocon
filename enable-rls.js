const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase credentials
const supabaseUrl = 'https://hieokzpxehyelhbubbpb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1ODQsImV4cCI6MjA3ODAzMTU4NH0.NDXes_vCvs9ocgJcc4BXqFXe68SUjRkBz_wEqvprLVo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function enableRLS() {
  console.log('🔒 Enabling Row Level Security for all tables...\n');

  // Read the migration file
  const migrationPath = path.join(__dirname, 'db', 'migrations', '2025-11-08-enable-rls-all-tables.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file:', migrationPath);
  console.log('📝 SQL length:', migrationSQL.length, 'characters\n');

  // Note: This requires a service role key or the exec_sql RPC function
  // For now, we'll output instructions
  console.log('⚠️  This migration needs to be run manually in Supabase SQL Editor\n');
  console.log('Steps:');
  console.log('1. Go to: https://supabase.com/dashboard/project/hieokzpxehyelhbubbpb/sql');
  console.log('2. Copy and paste the contents of:');
  console.log('   db/migrations/2025-11-08-enable-rls-all-tables.sql');
  console.log('3. Click "Run" to execute the migration\n');

  console.log('The migration will:');
  console.log('✓ Enable RLS on all tables');
  console.log('✓ Create policies for authenticated users');
  console.log('✓ Clean up old staging policies');
  console.log('✓ Preserve existing specific policies\n');

  console.log('📋 Tables that will have RLS enabled:');
  const tables = [
    'projects', 'users', 'contacts', 'customers', 'stages', 'managers', 'owners',
    'change_orders', 'pay_apps', 'billings', 'proposals', 'purchase_orders',
    'sov_lines', 'sov_line_progress',
    'project_comments', 'project_tasks', 'project_task_completion', 'project_subcontractors',
    'subcontractors', 'vendors', 'comment_mentions', 'tasks'
  ];

  tables.forEach((table, index) => {
    console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${table}`);
  });

  console.log('\n✅ Migration file is ready to run!');
}

enableRLS().catch(console.error);
