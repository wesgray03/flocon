#!/usr/bin/env node
/**
 * Get actual column definitions from information_schema
 */

const { createClient } = require('@supabase/supabase-js');

const stagingClient = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ'
);

async function getSchema() {
  console.log('📋 Getting QB columns from STAGING schema\n');

  const tables = ['engagements', 'companies', 'engagement_pay_apps'];

  for (const table of tables) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Table: ${table}`);
    console.log('='.repeat(80));

    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = '${table}'
        AND (column_name LIKE '%qbo%' OR column_name LIKE '%qb_%')
      ORDER BY ordinal_position;
    `;

    const { data, error } = await stagingClient.rpc('exec_sql', { sql: query });

    if (error) {
      console.log(`Query: ${query}`);
      console.log(`Error: ${error.message}`);

      // Try alternative approach
      const { data: altData, error: altError } = await stagingClient
        .from(table)
        .select('*')
        .limit(1);

      if (!altError && altData && altData.length > 0) {
        const qbCols = Object.keys(altData[0]).filter(
          (k) => k.includes('qbo') || k.includes('qb_')
        );
        console.log(`\nQB Columns found (${qbCols.length}):`);
        qbCols.forEach((col) => console.log(`  - ${col}`));
      }
    } else {
      console.log(data);
    }
  }
}

getSchema().catch(console.error);
