#!/usr/bin/env node
/**
 * Import CSV data to PRODUCTION database
 *
 * PRODUCTION URL: https://groxqyaoavmfvmaymhbe.supabase.co
 *
 * This script requires the PRODUCTION service role key
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PRODUCTION DATABASE
const PRODUCTION_URL = 'https://groxqyaoavmfvmaymhbe.supabase.co';

// Get service key from environment or command line argument
const serviceKey = process.env.PRODUCTION_SERVICE_KEY || process.argv[2];

if (!serviceKey) {
  console.error('❌ Missing production service role key!');
  console.error('');
  console.error('Usage:');
  console.error('   node import-to-production.js <service-role-key>');
  console.error('');
  console.error('Or set environment variable:');
  console.error('   $env:PRODUCTION_SERVICE_KEY="your-key-here"');
  console.error('   node import-to-production.js');
  console.error('');
  process.exit(1);
}

console.log('🚀 Production Database Import');
console.log('=====================================');
console.log(`📍 Target: ${PRODUCTION_URL}`);
console.log(`🔑 Using service key: ${serviceKey.substring(0, 20)}...`);
console.log('');

const supabase = createClient(PRODUCTION_URL, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parse CSV file
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    cast: (value, context) => {
      // Handle boolean values
      if (value === 'TRUE' || value === 'true') return true;
      if (value === 'FALSE' || value === 'false') return false;
      // Handle empty strings as null
      if (value === '' || value === 'NULL') return null;
      return value;
    },
  });

  return records;
}

// Convert Excel serial date (as string/number) to YYYY-MM-DD
function excelToISODate(value) {
  if (value === null || value === undefined || value === '') return null;
  // If already looks like YYYY-MM-DD, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return value;
  // If numeric (e.g., '45444'), convert from Excel serial (1900 system)
  const n = Number(value);
  if (!Number.isNaN(n) && Number.isFinite(n)) {
    const epoch = Date.UTC(1899, 11, 30); // Excel serial date base
    const ms = epoch + Math.round(n) * 86400000;
    const d = new Date(ms);
    const iso = d.toISOString().slice(0, 10);
    return iso;
  }
  return null;
}

/**
 * Check if database is empty
 */
async function checkDatabaseEmpty() {
  console.log('🔍 Checking if production database is empty...\n');

  const tables = [
    'stages',
    'users',
    'companies',
    'contacts',
    'engagements',
    'engagement_parties',
  ];
  let totalRecords = 0;

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`   ${table.padEnd(25)} ${count} records`);
      totalRecords += count || 0;
    }
  }

  return totalRecords;
}

/**
 * Import records to table (with upsert)
 */
async function importRecords(tableName, records) {
  console.log(`\n⬆️  Importing ${records.length} records to ${tableName}...`);

  const batchSize = 100;
  let imported = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(
        `❌ Error importing batch ${Math.floor(i / batchSize) + 1}:`,
        error
      );
      throw error;
    }

    imported += batch.length;
    console.log(`   Imported ${imported}/${records.length}...`);
  }

  console.log(`✅ Successfully imported ${imported} records to ${tableName}`);
}

/**
 * Main execution
 */
async function main() {
  const parsedDir = path.join(__dirname, 'import-templates', 'parsed');

  try {
    // 1. Check database state
    const existingRecords = await checkDatabaseEmpty();

    if (existingRecords > 0) {
      console.log(
        `\n⚠️  WARNING: Database contains ${existingRecords} existing records!`
      );
      console.log(
        '   This script will UPSERT (update or insert) the CSV data.'
      );
      console.log('   Existing records with matching IDs will be updated.');
      console.log('');
      console.log(
        '   Press Ctrl+C to cancel, or wait 5 seconds to continue...'
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } else {
      console.log('\n✅ Database is empty - ready for import!\n');
    }

    // 2. Parse all CSV files
    console.log('📂 Reading CSV files...');
    const stages = parseCSV(path.join(parsedDir, '01-stages-template.csv'));
    const rawUsers = parseCSV(path.join(parsedDir, '02-users-template.csv'));
    const rawCompanies = parseCSV(
      path.join(parsedDir, '03-companies-template.csv')
    );
    const rawContacts = parseCSV(
      path.join(parsedDir, '04-contacts-template.csv')
    );
    const rawEngagements = parseCSV(path.join(parsedDir, '05-engagements.csv'));
    const engagementParties = parseCSV(
      path.join(parsedDir, '06-engagement-parties-transformed.csv')
    );

    // Transform Users to match production schema
    const roleMap = {
      field: 'Field',
      office: 'Office',
      admin: 'Admin',
    };
    const users = rawUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      user_type: roleMap[(u.role || '').toLowerCase()] || 'Office',
      can_manage_prospects: false,
      can_manage_projects: false,
    }));

    // Transform Companies: keep only known columns
    const companies = rawCompanies.map((c) => ({
      id: c.id,
      name: c.name,
      company_type: c.company_type,
      is_customer: c.is_customer,
      is_vendor: c.is_vendor,
      is_subcontractor: c.is_subcontractor,
      email: c.email || null,
      phone: c.phone || null,
      address: c.address || null,
      notes: c.notes || null,
    }));

    // Transform Contacts: keep only known columns
    const contacts = rawContacts.map((c) => ({
      id: c.id,
      company_id: c.company_id,
      name: c.name,
      contact_type: c.contact_type,
      email: c.email || null,
      phone: c.phone || null,
    }));

    // Transform Engagements: split into engagements and engagement_user_roles
    const engagements = rawEngagements.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      project_number: e.project_number,
      contract_amount: e.contract_amount,
      start_date: excelToISODate(e.start_date),
      end_date: excelToISODate(e.end_date),
      stage_id: e.stage_id,
      est_start_date: excelToISODate(e.est_start_date) || null,
    }));

    const engagementUserRoles = rawEngagements
      .filter((e) => e.user_id && e.role)
      .map((e) => ({
        engagement_id: e.id,
        user_id: e.user_id,
        role: e.role,
        is_primary: true,
      }));

    console.log('✅ All CSV files parsed');
    console.log(
      `   Stages: ${stages.length}, Users: ${users.length}, Companies: ${companies.length}`
    );
    console.log(
      `   Contacts: ${contacts.length}, Engagements: ${engagements.length}, Parties: ${engagementParties.length}`
    );

    // 3. Import data in order
    console.log('\n📥 Starting imports to PRODUCTION...');
    console.log('=====================================');

    await importRecords('stages', stages);
    await importRecords('users', users);
    await importRecords('companies', companies);
    await importRecords('contacts', contacts);
    await importRecords('engagements', engagements);
    await importRecords('engagement_parties', engagementParties);
    // Insert user roles (no id provided; rely on DB default)
    if (engagementUserRoles.length > 0) {
      console.log(
        `\n⬆️  Inserting ${engagementUserRoles.length} engagement user roles...`
      );
      const { error: eurError } = await supabase
        .from('engagement_user_roles')
        .insert(engagementUserRoles);
      if (eurError) {
        throw eurError;
      }
      console.log('✅ Engagement user roles inserted');
    }

    console.log('\n🎉 All data imported successfully to PRODUCTION!');
    console.log('\n📊 Summary:');
    console.log(`   Database:           ${PRODUCTION_URL}`);
    console.log(`   Stages:             ${stages.length}`);
    console.log(`   Users:              ${users.length}`);
    console.log(`   Companies:          ${companies.length}`);
    console.log(`   Contacts:           ${contacts.length}`);
    console.log(`   Engagements:        ${engagements.length}`);
    console.log(`   Engagement Parties: ${engagementParties.length}`);
    console.log(`   Engagement User Roles: ${engagementUserRoles.length}`);
    console.log('\n✅ Next steps:');
    console.log(
      '   1. Run post-import-autocomplete-tasks.sql in production SQL editor'
    );
    console.log(
      '   2. Run verify-production-import.sql in production SQL editor'
    );
    console.log('   3. Test app functionality');
    console.log(
      `   4. Dashboard: https://supabase.com/dashboard/project/groxqyaoavmfvmaymhbe`
    );
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

main();
