import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
});

async function runMigration() {
  console.log(
    'Running migration: Update dashboard view for superintendent/foreman\n'
  );

  try {
    // Read migration file
    const migrationSQL = readFileSync(
      'db/migrations/2025-11-10-update-dashboard-view-for-staff.sql',
      'utf-8'
    );

    // Execute migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration successful!');
    console.log('\nChanges made:');
    console.log(
      '  - Updated project_dashboard view to include superintendent and foreman'
    );

    // Verify view
    const { data, error: verifyError } = await supabase
      .from('project_dashboard')
      .select('superintendent, foreman')
      .limit(1);

    if (!verifyError) {
      console.log('\n✅ View updated successfully');
    }
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

runMigration();
