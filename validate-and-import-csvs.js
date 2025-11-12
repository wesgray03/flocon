#!/usr/bin/env node
/**
 * Validate and Import CSV Data to Production
 *
 * This script:
 * 1. Validates all CSV files for format issues
 * 2. Checks UUID validity
 * 3. Validates foreign key references
 * 4. Imports data in correct order
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error(
    '   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
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

/**
 * Validate UUID format
 */
function isValidUUID(uuid) {
  if (!uuid) return false;
  return UUID_REGEX.test(uuid);
}

/**
 * Validate stages data
 */
function validateStages(records) {
  console.log('\n📋 Validating stages...');
  const errors = [];

  records.forEach((record, idx) => {
    if (!record.id || !isValidUUID(record.id)) {
      errors.push(`Row ${idx + 1}: Invalid UUID for id: ${record.id}`);
    }
    if (!record.name) {
      errors.push(`Row ${idx + 1}: Missing name`);
    }
    if (!record.order || isNaN(record.order)) {
      errors.push(`Row ${idx + 1}: Invalid order: ${record.order}`);
    }
  });

  if (errors.length > 0) {
    console.error('❌ Validation errors:');
    errors.forEach((err) => console.error(`   ${err}`));
    return false;
  }

  console.log(`✅ ${records.length} stages validated`);
  return true;
}

/**
 * Validate users data
 */
function validateUsers(records) {
  console.log('\n👤 Validating users...');
  const errors = [];

  records.forEach((record, idx) => {
    if (!record.id || !isValidUUID(record.id)) {
      errors.push(`Row ${idx + 1}: Invalid UUID for id: ${record.id}`);
    }
    if (!record.email) {
      errors.push(`Row ${idx + 1}: Missing email`);
    }
    if (!record.role) {
      errors.push(`Row ${idx + 1}: Missing role`);
    }
  });

  if (errors.length > 0) {
    console.error('❌ Validation errors:');
    errors.forEach((err) => console.error(`   ${err}`));
    return false;
  }

  console.log(`✅ ${records.length} users validated`);
  return true;
}

/**
 * Validate companies data
 */
function validateCompanies(records) {
  console.log('\n🏢 Validating companies...');
  const errors = [];

  records.forEach((record, idx) => {
    if (!record.id || !isValidUUID(record.id)) {
      errors.push(`Row ${idx + 1}: Invalid UUID for id: ${record.id}`);
    }
    if (!record.name) {
      errors.push(`Row ${idx + 1}: Missing name`);
    }
  });

  if (errors.length > 0) {
    console.error('❌ Validation errors:');
    errors.forEach((err) => console.error(`   ${err}`));
    return false;
  }

  console.log(`✅ ${records.length} companies validated`);
  return true;
}

/**
 * Validate contacts data
 */
function validateContacts(records, companies) {
  console.log('\n👥 Validating contacts...');
  const errors = [];
  const companyIds = new Set(companies.map((c) => c.id));

  records.forEach((record, idx) => {
    if (!record.id || !isValidUUID(record.id)) {
      errors.push(`Row ${idx + 1}: Invalid UUID for id: ${record.id}`);
    }
    if (record.company_id && !isValidUUID(record.company_id)) {
      errors.push(
        `Row ${idx + 1}: Invalid UUID for company_id: ${record.company_id}`
      );
    }
    if (record.company_id && !companyIds.has(record.company_id)) {
      errors.push(
        `Row ${idx + 1}: company_id references non-existent company: ${record.company_id}`
      );
    }
  });

  if (errors.length > 0) {
    console.error('❌ Validation errors:');
    errors.forEach((err) => console.error(`   ${err}`));
    return false;
  }

  console.log(`✅ ${records.length} contacts validated`);
  return true;
}

/**
 * Validate engagements data
 */
function validateEngagements(records, stages, users) {
  console.log('\n📊 Validating engagements...');
  const errors = [];
  const stageIds = new Set(stages.map((s) => s.id));
  const userIds = new Set(users.map((u) => u.id));

  records.forEach((record, idx) => {
    if (!record.id || !isValidUUID(record.id)) {
      errors.push(`Row ${idx + 1}: Invalid UUID for id: ${record.id}`);
    }
    if (!record.name) {
      errors.push(`Row ${idx + 1}: Missing name`);
    }
    if (!record.type || !['project', 'prospect'].includes(record.type)) {
      errors.push(`Row ${idx + 1}: Invalid type: ${record.type}`);
    }
    if (record.current_stage_id && !isValidUUID(record.current_stage_id)) {
      errors.push(
        `Row ${idx + 1}: Invalid UUID for current_stage_id: ${record.current_stage_id}`
      );
    }
    if (record.current_stage_id && !stageIds.has(record.current_stage_id)) {
      errors.push(
        `Row ${idx + 1}: current_stage_id references non-existent stage: ${record.current_stage_id}`
      );
    }
    if (record.owner_id && !isValidUUID(record.owner_id)) {
      errors.push(
        `Row ${idx + 1}: Invalid UUID for owner_id: ${record.owner_id}`
      );
    }
    if (record.owner_id && !userIds.has(record.owner_id)) {
      errors.push(
        `Row ${idx + 1}: owner_id references non-existent user: ${record.owner_id}`
      );
    }
  });

  if (errors.length > 0) {
    console.error('❌ Validation errors:');
    errors.forEach((err) => console.error(`   ${err}`));
    return false;
  }

  console.log(`✅ ${records.length} engagements validated`);
  return true;
}

/**
 * Validate engagement_parties data
 */
function validateEngagementParties(
  records,
  engagements,
  companies,
  contacts,
  users
) {
  console.log('\n🤝 Validating engagement_parties...');
  const errors = [];
  const engagementIds = new Set(engagements.map((e) => e.id));
  const companyIds = new Set(companies.map((c) => c.id));
  const contactIds = new Set(contacts.map((c) => c.id));
  const userIds = new Set(users.map((u) => u.id));
  const allPartyIds = new Set([...companyIds, ...contactIds, ...userIds]);

  records.forEach((record, idx) => {
    if (!record.id || !isValidUUID(record.id)) {
      errors.push(`Row ${idx + 1}: Invalid UUID for id: ${record.id}`);
    }
    if (!record.engagement_id || !isValidUUID(record.engagement_id)) {
      errors.push(
        `Row ${idx + 1}: Invalid UUID for engagement_id: ${record.engagement_id}`
      );
    }
    if (record.engagement_id && !engagementIds.has(record.engagement_id)) {
      errors.push(
        `Row ${idx + 1}: engagement_id references non-existent engagement: ${record.engagement_id}`
      );
    }
    if (!record.party_id || !isValidUUID(record.party_id)) {
      errors.push(
        `Row ${idx + 1}: Invalid UUID for party_id: ${record.party_id}`
      );
    }
    if (record.party_id && !allPartyIds.has(record.party_id)) {
      errors.push(
        `Row ${idx + 1}: party_id references non-existent party: ${record.party_id}`
      );
    }
    if (!record.role) {
      errors.push(`Row ${idx + 1}: Missing role`);
    }
  });

  if (errors.length > 0) {
    console.error('❌ Validation errors:');
    errors.forEach((err) => console.error(`   ${err}`));
    return false;
  }

  console.log(`✅ ${records.length} engagement_parties validated`);
  return true;
}

/**
 * Import records to table
 */
async function importRecords(tableName, records) {
  console.log(`\n⬆️  Importing ${records.length} records to ${tableName}...`);

  // Import in batches of 100
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
  console.log('🚀 Starting CSV Validation and Import');
  console.log('=====================================\n');

  const parsedDir = path.join(__dirname, 'import-templates', 'parsed');

  try {
    // 1. Parse all CSV files
    console.log('📂 Reading CSV files...');
    const stages = parseCSV(path.join(parsedDir, '01-stages-template.csv'));
    const users = parseCSV(path.join(parsedDir, '02-users-template.csv'));
    const companies = parseCSV(
      path.join(parsedDir, '03-companies-template.csv')
    );
    const contacts = parseCSV(path.join(parsedDir, '04-contacts-template.csv'));
    const engagements = parseCSV(path.join(parsedDir, '05-engagements.csv'));
    const engagementParties = parseCSV(
      path.join(parsedDir, '06-engagement-parties-transformed.csv')
    );

    console.log('✅ All CSV files parsed');

    // 2. Validate all data
    console.log('\n🔍 Validating data integrity...');
    console.log('=====================================');

    if (!validateStages(stages)) throw new Error('Stages validation failed');
    if (!validateUsers(users)) throw new Error('Users validation failed');
    if (!validateCompanies(companies))
      throw new Error('Companies validation failed');
    if (!validateContacts(contacts, companies))
      throw new Error('Contacts validation failed');
    if (!validateEngagements(engagements, stages, users))
      throw new Error('Engagements validation failed');
    if (
      !validateEngagementParties(
        engagementParties,
        engagements,
        companies,
        contacts,
        users
      )
    ) {
      throw new Error('Engagement parties validation failed');
    }

    console.log('\n✅ All validation checks passed!');

    // 3. Import data in order
    console.log('\n📥 Starting imports...');
    console.log('=====================================');

    await importRecords('stages', stages);
    await importRecords('users', users);
    await importRecords('companies', companies);
    await importRecords('contacts', contacts);
    await importRecords('engagements', engagements);
    await importRecords('engagement_parties', engagementParties);

    console.log('\n🎉 All data imported successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Stages:             ${stages.length}`);
    console.log(`   Users:              ${users.length}`);
    console.log(`   Companies:          ${companies.length}`);
    console.log(`   Contacts:           ${contacts.length}`);
    console.log(`   Engagements:        ${engagements.length}`);
    console.log(`   Engagement Parties: ${engagementParties.length}`);
    console.log('\n✅ Next steps:');
    console.log('   1. Run post-import-autocomplete-tasks.sql');
    console.log('   2. Run verify-production-import.sql');
    console.log('   3. Test app functionality');
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

main();
