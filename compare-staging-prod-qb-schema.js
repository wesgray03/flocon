#!/usr/bin/env node
/**
 * Compare staging and production schemas for QB-related columns
 */

const { createClient } = require('@supabase/supabase-js');

// Staging
const stagingClient = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ'
);

// Production
const prodClient = createClient(
  'https://groxqyaoavmfvmaymhbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3hxeWFvYXZtZnZtYXltaGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3ODE1MywiZXhwIjoyMDc3MjU0MTUzfQ.FvweYdJG5d3pDZlU6SF8UEt7midPohX-1gtPyYvPQzw'
);

async function getTableColumns(client, tableName) {
  const { data, error } = await client.from(tableName).select('*').limit(0);

  if (error) {
    return null;
  }

  // Get column names from the empty result
  return data !== null ? Object.keys(data[0] || {}) : [];
}

async function compareSchemas() {
  console.log('🔍 Comparing Staging vs Production Schemas for QB columns\n');
  console.log('='.repeat(80));

  const tables = ['engagements', 'companies', 'engagement_pay_apps'];

  for (const table of tables) {
    console.log(`\n📊 Table: ${table}`);
    console.log('-'.repeat(80));

    const stagingCols = await getTableColumns(stagingClient, table);
    const prodCols = await getTableColumns(prodClient, table);

    if (!stagingCols) {
      console.log(`❌ ${table} not found in staging`);
      continue;
    }

    if (!prodCols) {
      console.log(`❌ ${table} not found in production`);
      continue;
    }

    const stagingQBCols = stagingCols.filter(
      (c) => c.includes('qbo') || c.includes('qb_')
    );
    const prodQBCols = prodCols.filter(
      (c) => c.includes('qbo') || c.includes('qb_')
    );

    console.log(`\nStaging QB columns (${stagingQBCols.length}):`);
    stagingQBCols.forEach((col) => console.log(`  ✅ ${col}`));

    console.log(`\nProduction QB columns (${prodQBCols.length}):`);
    if (prodQBCols.length === 0) {
      console.log('  ❌ NONE - needs migration');
    } else {
      prodQBCols.forEach((col) => console.log(`  ✅ ${col}`));
    }

    const missing = stagingQBCols.filter((col) => !prodQBCols.includes(col));
    if (missing.length > 0) {
      console.log(`\n⚠️  Missing in production (${missing.length}):`);
      missing.forEach((col) => console.log(`  ❌ ${col}`));
    }
  }

  // Check for qbo_tokens table
  console.log('\n='.repeat(80));
  console.log('\n📊 Table: qbo_tokens');
  console.log('-'.repeat(80));

  const { data: stagingTokens, error: stagingTokensError } = await stagingClient
    .from('qbo_tokens')
    .select('*')
    .limit(0);

  const { data: prodTokens, error: prodTokensError } = await prodClient
    .from('qbo_tokens')
    .select('*')
    .limit(0);

  if (!stagingTokensError) {
    console.log('✅ qbo_tokens exists in staging');
  } else {
    console.log('❌ qbo_tokens NOT in staging');
  }

  if (!prodTokensError) {
    console.log('✅ qbo_tokens exists in production');
  } else {
    console.log('❌ qbo_tokens NOT in production - needs migration');
  }

  // Check for qbo_vendor_import_list table
  console.log('\n📊 Table: qbo_vendor_import_list');
  console.log('-'.repeat(80));

  const { error: stagingVendorError } = await stagingClient
    .from('qbo_vendor_import_list')
    .select('*')
    .limit(0);

  const { error: prodVendorError } = await prodClient
    .from('qbo_vendor_import_list')
    .select('*')
    .limit(0);

  if (!stagingVendorError) {
    console.log('✅ qbo_vendor_import_list exists in staging');
  } else {
    console.log('❌ qbo_vendor_import_list NOT in staging');
  }

  if (!prodVendorError) {
    console.log('✅ qbo_vendor_import_list exists in production');
  } else {
    console.log(
      '❌ qbo_vendor_import_list NOT in production - needs migration'
    );
  }

  console.log('\n' + '='.repeat(80));
}

compareSchemas().catch(console.error);
