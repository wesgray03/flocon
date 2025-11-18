const { createClient } = require('@supabase/supabase-js');

const stagingClient = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ'
);

const prodClient = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw'
);

async function getAllTables(client) {
  // Try to query common tables and see what exists
  const commonTables = [
    'companies',
    'contacts',
    'engagements',
    'engagement_parties',
    'engagement_pay_apps',
    'engagement_change_orders',
    'engagement_subcontractors',
    'user_profiles',
    'auth_users',
    'qbo_tokens',
    'qbo_vendor_import_list',
  ];

  const existingTables = [];
  for (const table of commonTables) {
    const { error } = await client.from(table).select('*').limit(0);
    if (!error) {
      existingTables.push(table);
    }
  }
  return existingTables;
}

async function getAllColumns(tableName, client) {
  const { data, error } = await client.from(tableName).select('*').limit(1);
  if (error || !data || data.length === 0) {
    const emptyResult = await client.from(tableName).select('*').limit(0);
    if (emptyResult.data !== null) {
      return [];
    }
    return null;
  }
  return Object.keys(data[0]).sort();
}

async function compareAllTables() {
  console.log('\n=== DISCOVERING TABLES ===\n');

  const stagingTables = await getAllTables(stagingClient);
  const prodTables = await getAllTables(prodClient);

  console.log(`STAGING: ${stagingTables.length} tables`);
  console.log(`PROD: ${prodTables.length} tables`);

  const stagingOnly = stagingTables.filter((t) => !prodTables.includes(t));
  const prodOnly = prodTables.filter((t) => !stagingTables.includes(t));
  const common = stagingTables.filter((t) => prodTables.includes(t));

  if (stagingOnly.length > 0) {
    console.log('\n⚠️  TABLES ONLY IN STAGING:', stagingOnly.join(', '));
  }
  if (prodOnly.length > 0) {
    console.log('\n⚠️  TABLES ONLY IN PROD:', prodOnly.join(', '));
  }

  console.log('\n=== COMPARING COLUMNS IN COMMON TABLES ===\n');

  let hasDifferences = false;

  for (const table of common.sort()) {
    const stagingCols = await getAllColumns(table, stagingClient);
    const prodCols = await getAllColumns(table, prodClient);

    if (!stagingCols && !prodCols) {
      continue;
    }

    if (!stagingCols || !prodCols) {
      console.log(`⚠️  ${table}: Cannot compare (one has no data)`);
      continue;
    }

    const stagingOnlyCols = stagingCols.filter(
      (col) => !prodCols.includes(col)
    );
    const prodOnlyCols = prodCols.filter((col) => !stagingCols.includes(col));

    if (stagingOnlyCols.length === 0 && prodOnlyCols.length === 0) {
      console.log(`✅ ${table}: All columns match`);
    } else {
      hasDifferences = true;
      console.log(`\n--- ${table.toUpperCase()} ---`);
      if (stagingOnlyCols.length > 0) {
        console.log('  MISSING IN PROD:', stagingOnlyCols.join(', '));
      }
      if (prodOnlyCols.length > 0) {
        console.log('  ONLY IN PROD:', prodOnlyCols.join(', '));
      }
    }
  }

  if (!hasDifferences) {
    console.log('\n🎉 All tables and columns match!');
  }
}

compareAllTables();
