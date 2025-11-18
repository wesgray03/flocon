const { createClient } = require('@supabase/supabase-js');

const prodClient = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw'
);

async function checkSchema() {
  console.log('\n=== CHECKING PRODUCTION SCHEMA ===\n');

  // Check if tables exist by trying to query them
  const tables = [
    'companies',
    'engagements',
    'engagement_pay_apps',
    'qbo_tokens',
    'qbo_vendor_import_list',
  ];

  for (const table of tables) {
    const { data, error } = await prodClient.from(table).select('*').limit(0);
    if (error) {
      console.log(`❌ ${table}: ERROR - ${error.message}`);
    } else {
      console.log(`✅ ${table}: EXISTS`);
    }
  }

  // Try to get column info using a raw query approach
  console.log('\n=== CHECKING QB COLUMNS (Insert Test) ===\n');

  // For companies - test if qbo_id column exists
  const companyTest = await prodClient
    .from('companies')
    .select('id, qbo_id, qbo_last_synced_at')
    .limit(1);
  console.log(
    `companies QB columns: ${companyTest.error ? 'ERROR - ' + companyTest.error.message : 'qbo_id, qbo_last_synced_at exist'}`
  );

  // For engagements
  const engagementTest = await prodClient
    .from('engagements')
    .select('id, qbo_customer_id, qbo_job_id, qbo_last_synced_at')
    .limit(1);
  console.log(
    `engagements QB columns: ${engagementTest.error ? 'ERROR - ' + engagementTest.error.message : 'qbo_customer_id, qbo_job_id, qbo_last_synced_at exist'}`
  );

  // For pay apps
  const payAppTest = await prodClient
    .from('engagement_pay_apps')
    .select(
      'id, qbo_invoice_id, qbo_sync_status, qbo_synced_at, qbo_payment_total, qbo_sync_error'
    )
    .limit(1);
  console.log(
    `engagement_pay_apps QB columns: ${payAppTest.error ? 'ERROR - ' + payAppTest.error.message : 'all QB columns exist'}`
  );
}

checkSchema();
