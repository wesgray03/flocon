const { createClient } = require('@supabase/supabase-js');

const stagingClient = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ'
);

const prodClient = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzU0MDY0NSwiZXhwIjoyMDUzMTE2NjQ1fQ.1vL_3scFxlgGCJfVlzrCYCsOiZmEDSvK-EfQsJgM21o'
);

async function checkTable(tableName, client, envName) {
  const { data, error } = await client.from(tableName).select('*').limit(1);
  if (error || !data || data.length === 0) {
    console.log(`${envName} ${tableName}: No data or error`);
    return [];
  }
  const qbCols = Object.keys(data[0]).filter((k) =>
    k.toLowerCase().includes('qb')
  );
  return qbCols;
}

async function main() {
  const tables = ['companies', 'engagements', 'engagement_pay_apps'];

  console.log('\n=== STAGING QB COLUMNS ===\n');
  for (const table of tables) {
    const cols = await checkTable(table, stagingClient, 'STAGING');
    console.log(`${table}: ${cols.length > 0 ? cols.join(', ') : 'NONE'}`);
  }

  console.log('\n=== PRODUCTION QB COLUMNS ===\n');
  for (const table of tables) {
    const cols = await checkTable(table, prodClient, 'PROD');
    console.log(`${table}: ${cols.length > 0 ? cols.join(', ') : 'NONE'}`);
  }

  // Check for qbo_tokens table existence
  console.log('\n=== TABLE EXISTENCE ===\n');
  const stagingTokens = await stagingClient
    .from('qbo_tokens')
    .select('*')
    .limit(1);
  const prodTokens = await prodClient.from('qbo_tokens').select('*').limit(1);
  const stagingVendor = await stagingClient
    .from('qbo_vendor_import_list')
    .select('*')
    .limit(1);
  const prodVendor = await prodClient
    .from('qbo_vendor_import_list')
    .select('*')
    .limit(1);

  console.log(
    `STAGING qbo_tokens: ${stagingTokens.error ? 'MISSING' : 'EXISTS'}`
  );
  console.log(`PROD qbo_tokens: ${prodTokens.error ? 'MISSING' : 'EXISTS'}`);
  console.log(
    `STAGING qbo_vendor_import_list: ${stagingVendor.error ? 'MISSING' : 'EXISTS'}`
  );
  console.log(
    `PROD qbo_vendor_import_list: ${prodVendor.error ? 'MISSING' : 'EXISTS'}`
  );
}

main();
