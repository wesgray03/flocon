const { createClient } = require('@supabase/supabase-js');

const stagingClient = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ'
);

const prodClient = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw'
);

async function getAllColumns(tableName, client) {
  const { data, error } = await client.from(tableName).select('*').limit(1);
  if (error || !data || data.length === 0) {
    // Try to get structure even if no data
    const emptyResult = await client.from(tableName).select('*').limit(0);
    if (emptyResult.data !== null) {
      // Return empty array if table exists but has no rows
      return [];
    }
    return null;
  }
  return Object.keys(data[0]).sort();
}

async function compareAllColumns() {
  const tables = ['companies', 'engagements', 'engagement_pay_apps'];

  console.log('\n=== COMPARING ALL COLUMNS ===\n');

  for (const table of tables) {
    console.log(`\n--- ${table.toUpperCase()} ---`);

    const stagingCols = await getAllColumns(table, stagingClient);
    const prodCols = await getAllColumns(table, prodClient);

    if (!stagingCols && !prodCols) {
      console.log('Both: No data or table missing');
      continue;
    }

    if (!stagingCols) {
      console.log('STAGING: No data');
      console.log(`PROD: ${prodCols ? prodCols.length : 0} columns`);
      continue;
    }

    if (!prodCols) {
      console.log(`STAGING: ${stagingCols.length} columns`);
      console.log('PROD: No data');
      console.log('\nColumns in STAGING:', stagingCols.join(', '));
      continue;
    }

    // Find differences
    const stagingOnly = stagingCols.filter((col) => !prodCols.includes(col));
    const prodOnly = prodCols.filter((col) => !stagingCols.includes(col));

    if (stagingOnly.length === 0 && prodOnly.length === 0) {
      console.log('✅ All columns match');
    } else {
      if (stagingOnly.length > 0) {
        console.log('⚠️  MISSING IN PROD:', stagingOnly.join(', '));
      }
      if (prodOnly.length > 0) {
        console.log('⚠️  ONLY IN PROD:', prodOnly.join(', '));
      }
    }
  }
}

compareAllColumns();
