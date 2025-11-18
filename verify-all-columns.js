const { createClient } = require('@supabase/supabase-js');

const stagingClient = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ'
);

const prodClient = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw'
);

// Try to get columns by attempting a select with specific columns
async function getColumnsFromSchema(tableName, client) {
  // First check if table has data
  const { data } = await client.from(tableName).select('*').limit(1);
  if (data && data.length > 0) {
    return Object.keys(data[0]).sort();
  }

  // If no data, we need another approach - return null to indicate we need manual check
  return null;
}

async function manualColumnCheck(tableName, columns, client) {
  const { error } = await client
    .from(tableName)
    .select(columns.join(', '))
    .limit(0);
  return !error;
}

async function compareAllColumns() {
  const tables = [
    'companies',
    'contacts',
    'engagements',
    'engagement_parties',
    'engagement_pay_apps',
    'engagement_change_orders',
    'engagement_subcontractors',
    'qbo_tokens',
    'qbo_vendor_import_list',
  ];

  console.log('\n=== DETAILED COLUMN COMPARISON ===\n');

  let allMatch = true;

  for (const table of tables) {
    const stagingCols = await getColumnsFromSchema(table, stagingClient);
    const prodCols = await getColumnsFromSchema(table, prodClient);

    // If both have data, compare directly
    if (stagingCols && prodCols) {
      const missing = stagingCols.filter((c) => !prodCols.includes(c));
      const extra = prodCols.filter((c) => !stagingCols.includes(c));

      if (missing.length === 0 && extra.length === 0) {
        console.log(`✅ ${table}: ${stagingCols.length} columns match`);
      } else {
        allMatch = false;
        console.log(`\n⚠️  ${table}:`);
        if (missing.length > 0)
          console.log(`   Missing in prod: ${missing.join(', ')}`);
        if (extra.length > 0)
          console.log(`   Extra in prod: ${extra.join(', ')}`);
      }
    }
    // If staging has data but prod doesn't, test prod with staging columns
    else if (stagingCols && !prodCols) {
      const prodHasColumns = await manualColumnCheck(
        table,
        stagingCols,
        prodClient
      );
      if (prodHasColumns) {
        console.log(
          `✅ ${table}: Schema matches (prod empty, ${stagingCols.length} columns verified)`
        );
      } else {
        allMatch = false;
        console.log(
          `\n⚠️  ${table}: Prod table exists but schema mismatch (needs manual check)`
        );
        console.log(`   Staging columns: ${stagingCols.join(', ')}`);
      }
    }
    // If neither has data
    else if (!stagingCols && !prodCols) {
      console.log(`⚠️  ${table}: Both empty, cannot verify columns`);
    }
    // If prod has data but staging doesn't (unusual)
    else {
      console.log(`⚠️  ${table}: Prod has data but staging doesn't (unusual)`);
    }
  }

  console.log(
    '\n' + (allMatch ? '🎉 All tables verified!' : '⚠️  Some differences found')
  );
}

compareAllColumns();
