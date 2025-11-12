// Apply user role rename migration to staging database
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ'
);

async function applyMigration() {
  console.log('Applying user role rename migration...\n');

  try {
    // Check current data
    console.log('Current data before migration:');
    const { data: beforeData } = await supabase
      .from('engagement_user_roles')
      .select('role')
      .limit(10);
    console.log('Roles:', [...new Set((beforeData || []).map((r) => r.role))]);

    // Update project_owner to project_lead
    console.log('\n1. Updating project_owner -> project_lead...');
    const { data: update1, error: error1 } = await supabase.rpc('exec_sql', {
      sql: "UPDATE engagement_user_roles SET role = 'project_lead' WHERE role = 'project_owner'",
    });
    if (error1) {
      console.error('Error updating project_owner:', error1);
    } else {
      console.log('✓ Updated project_owner to project_lead');
    }

    // Update prospect_owner to sales_lead
    console.log('\n2. Updating prospect_owner -> sales_lead...');
    const { data: update2, error: error2 } = await supabase.rpc('exec_sql', {
      sql: "UPDATE engagement_user_roles SET role = 'sales_lead' WHERE role = 'prospect_owner'",
    });
    if (error2) {
      console.error('Error updating prospect_owner:', error2);
    } else {
      console.log('✓ Updated prospect_owner to sales_lead');
    }

    // Check data after migration
    console.log('\nData after migration:');
    const { data: afterData } = await supabase
      .from('engagement_user_roles')
      .select('role')
      .limit(10);
    console.log('Roles:', [...new Set((afterData || []).map((r) => r.role))]);

    console.log('\n✅ Migration complete!');
    console.log(
      '\nNOTE: You need to manually update the CHECK constraint in Supabase dashboard:'
    );
    console.log(
      'ALTER TABLE engagement_user_roles DROP CONSTRAINT IF EXISTS engagement_user_roles_role_check;'
    );
    console.log(
      "ALTER TABLE engagement_user_roles ADD CONSTRAINT engagement_user_roles_role_check CHECK (role IN ('sales_lead', 'project_lead', 'foreman', 'estimator', 'project_admin', 'observer'));"
    );
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

applyMigration().catch(console.error);
