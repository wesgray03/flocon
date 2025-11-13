#!/usr/bin/env node
/**
 * Automated Production → Staging Data Sync
 *
 * What it does:
 * 1. Backs up production data (safety net)
 * 2. Dumps all production table data
 * 3. Wipes staging tables (preserves schema)
 * 4. Restores production data to staging
 *
 * Usage:
 *   node sync-prod-to-staging.js
 *
 * Prerequisites:
 *   - .env.production.local with production credentials
 *   - .env.staging.local with staging credentials
 *   - Both environments must have identical schemas
 */

require('dotenv').config({ path: '.env.production.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Load staging credentials
const stagingEnv = require('dotenv').parse(
  fs.readFileSync('.env.staging.local')
);
const STAGING_URL = stagingEnv.NEXT_PUBLIC_SUPABASE_URL;
const STAGING_KEY = stagingEnv.SUPABASE_SERVICE_ROLE_KEY;

const prodClient = createClient(PROD_URL, PROD_KEY);
const stagingClient = createClient(STAGING_URL, STAGING_KEY);

// Tables to sync (order matters for FK constraints)
const TABLES = [
  'users',
  'companies',
  'contacts',
  'stages',
  'trades',
  'probability_levels',
  'lost_reasons',
  'engagement_tasks',
  'engagements',
  'engagement_parties',
  'engagement_user_roles',
  'engagement_subcontractors',
  'engagement_task_completion',
  'engagement_comments',
  'comment_mentions',
  'engagement_change_orders',
  'engagement_trades',
  'engagement_sov_lines',
  'engagement_sov_line_progress',
  'engagement_pay_apps',
  'company_vendor_details',
  'company_subcontractor_details',
];

async function createBackup(client, label) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`\n📦 Creating ${label} backup...`);
  const backup = {};

  for (const table of TABLES) {
    try {
      const { data, error } = await client.from(table).select('*');
      if (error) {
        console.warn(`  ⚠️  ${table}: ${error.message}`);
        continue;
      }
      backup[table] = data || [];
      console.log(`  ✅ ${table}: ${data?.length || 0} rows`);
    } catch (err) {
      console.warn(`  ⚠️  ${table}: ${err.message}`);
    }
  }

  const backupFile = path.join(backupDir, `${label}-${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`\n💾 Backup saved: ${backupFile}`);
  return backupFile;
}

async function wipeTable(client, table) {
  try {
    // Get all IDs first
    const { data: rows, error: selectError } = await client
      .from(table)
      .select('id')
      .limit(10000);

    if (selectError) throw selectError;
    if (!rows || rows.length === 0) return 0;

    // Delete in batches to avoid timeouts
    const batchSize = 500;
    let deleted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map((r) => r.id);
      const { error: deleteError } = await client
        .from(table)
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.warn(`    ⚠️  Batch delete failed: ${deleteError.message}`);
      } else {
        deleted += batch.length;
      }
    }

    return deleted;
  } catch (err) {
    console.warn(`    ⚠️  ${err.message}`);
    return 0;
  }
}

async function copyTable(sourceClient, targetClient, table) {
  try {
    // Fetch all data from source
    const { data: rows, error: fetchError } = await sourceClient
      .from(table)
      .select('*')
      .limit(100000);

    if (fetchError) throw fetchError;
    if (!rows || rows.length === 0) {
      console.log(`  ⏭️  ${table}: no data to copy`);
      return 0;
    }

    // Insert in batches (with per-table transforms if needed)
    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      let batch = rows.slice(i, i + batchSize);

      // Compatibility fix: map legacy role names to current ones
      if (table === 'engagement_user_roles') {
        batch = batch.map((r) => {
          if (!r || typeof r !== 'object') return r;
          const role = r.role;
          if (role === 'prospect_owner') return { ...r, role: 'sales_lead' };
          if (role === 'project_owner') return { ...r, role: 'project_lead' };
          return r;
        });
      }

      // Staging schema compatibility: let defaults apply for certain users columns
      if (table === 'users') {
        batch = batch.map((r) => {
          if (!r || typeof r !== 'object') return r;
          const { can_manage_prospects, can_manage_projects, ...rest } = r;
          return rest;
        });
      }
      const { error: insertError } = await targetClient
        .from(table)
        .insert(batch);

      if (insertError) {
        console.warn(
          `    ⚠️  Batch ${i}-${i + batch.length} failed in ${table}: ${insertError.message}`
        );
      } else {
        inserted += batch.length;
      }
    }

    console.log(`  ✅ ${table}: ${inserted} rows copied`);
    return inserted;
  } catch (err) {
    console.warn(`  ⚠️  ${table}: ${err.message}`);
    return 0;
  }
}

async function main() {
  console.log('🚀 Production → Staging Data Sync\n');
  console.log('Production:', PROD_URL);
  console.log('Staging:', STAGING_URL);

  // Step 1: Backup production (safety)
  await createBackup(prodClient, 'production');

  // Step 2: Backup staging (before wipe)
  await createBackup(stagingClient, 'staging');

  // Step 3: Wipe staging data (reverse order for FK constraints)
  console.log('\n🗑️  Wiping staging tables...');
  for (const table of [...TABLES].reverse()) {
    const deleted = await wipeTable(stagingClient, table);
    if (deleted > 0) {
      console.log(`  ✅ ${table}: deleted ${deleted} rows`);
    }
  }

  // Step 4: Copy production data to staging
  console.log('\n📋 Copying production data to staging...');
  let totalCopied = 0;
  for (const table of TABLES) {
    const copied = await copyTable(prodClient, stagingClient, table);
    totalCopied += copied;
  }

  console.log(`\n✨ Sync complete! ${totalCopied} total rows copied.`);
  console.log('\n💡 Staging now has clean production data.');
  console.log('   You may need to run migrations if schemas differ.\n');
}

main().catch((err) => {
  console.error('\n❌ Sync failed:', err);
  process.exit(1);
});
