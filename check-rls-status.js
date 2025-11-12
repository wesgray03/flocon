const { createClient } = require('@supabase/supabase-js');

// Read from .env.local file
const supabaseUrl = 'https://hieokzpxehyelhbubbpb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU1ODQsImV4cCI6MjA3ODAzMTU4NH0.NDXes_vCvs9ocgJcc4BXqFXe68SUjRkBz_wEqvprLVo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSStatus() {
  console.log('Checking RLS status for all tables...\n');

  // Query to get all tables and their RLS status
  const query = `
    SELECT 
      tablename,
      rowsecurity as rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });

  if (error) {
    console.error('Error querying tables:', error.message);
    console.log('\nTrying alternative method...\n');
    
    // List known tables and check individually
    const knownTables = [
      'projects', 'users', 'contacts', 'customers', 'stages', 'managers', 'owners',
      'subcontractors', 'vendors', 'change_orders', 'pay_apps', 'sov_lines',
      'sov_line_progress', 'project_comments', 'project_tasks', 'project_task_completion',
      'project_subcontractors', 'billings', 'proposals', 'purchase_orders',
      'comment_mentions', 'tasks'
    ];

    console.log('Tables found in migration files:');
    for (const table of knownTables) {
      console.log(`  - ${table}`);
    }
    
    return;
  }

  console.log('Tables and RLS Status:');
  console.log('─'.repeat(50));
  
  if (data && data.length > 0) {
    data.forEach(row => {
      const status = row.rls_enabled ? '✓ ENABLED' : '✗ DISABLED';
      console.log(`${row.tablename.padEnd(30)} ${status}`);
    });
  }
}

checkRLSStatus().catch(console.error);
