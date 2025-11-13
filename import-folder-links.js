#!/usr/bin/env node
/**
 * Import SharePoint folder links from CSV
 * 
 * Updates engagements.sharepoint_folder by matching project_number
 * 
 * Usage:
 *   node import-folder-links.js [--staging|--production]
 * 
 * Default: staging
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');

// Parse command line arguments
const args = process.argv.slice(2);
const isProduction = args.includes('--production') || args.includes('--prod');
const isStaging = args.includes('--staging') || !isProduction;

// Load appropriate environment
let SUPABASE_URL, SUPABASE_KEY, envLabel;
if (isProduction) {
  const prodEnv = require('dotenv').parse(fs.readFileSync('.env.production.local'));
  SUPABASE_URL = prodEnv.NEXT_PUBLIC_SUPABASE_URL;
  SUPABASE_KEY = prodEnv.SUPABASE_SERVICE_ROLE_KEY;
  envLabel = 'PRODUCTION';
} else {
  const stagingEnv = require('dotenv').parse(fs.readFileSync('.env.staging.local'));
  SUPABASE_URL = stagingEnv.NEXT_PUBLIC_SUPABASE_URL;
  SUPABASE_KEY = stagingEnv.SUPABASE_SERVICE_ROLE_KEY;
  envLabel = 'STAGING';
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CSV_PATH = path.join(__dirname, 'import-templates', 'folder links.csv');

async function main() {
  console.log(`\n📁 SharePoint Folder Links Import (${envLabel})`);
  console.log('='.repeat(60));
  console.log(`Target: ${SUPABASE_URL}`);
  console.log(`CSV: ${CSV_PATH}\n`);

  // Read and parse CSV
  if (!fs.existsSync(CSV_PATH)) {
    console.error('❌ CSV file not found:', CSV_PATH);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 Found ${records.length} folder links in CSV\n`);

  // Update each engagement
  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const record of records) {
    const projectNumber = record.project_number?.trim();
    const folderUrl = record.Folder?.trim();

    if (!projectNumber || !folderUrl) {
      console.warn(`⚠️  Skipping row with missing data`);
      continue;
    }

    try {
      // Find engagement by project_number
      const { data: engagements, error: findError } = await supabase
        .from('engagements')
        .select('id, name, sharepoint_folder')
        .eq('project_number', projectNumber)
        .limit(1);

      if (findError) {
        console.error(`❌ ${projectNumber}: Query error - ${findError.message}`);
        errors++;
        continue;
      }

      if (!engagements || engagements.length === 0) {
        console.log(`⏭️  ${projectNumber}: Not found in database`);
        notFound++;
        continue;
      }

      const engagement = engagements[0];

      // Update sharepoint_folder
      const { error: updateError } = await supabase
        .from('engagements')
        .update({ sharepoint_folder: folderUrl })
        .eq('id', engagement.id);

      if (updateError) {
        console.error(`❌ ${projectNumber}: Update error - ${updateError.message}`);
        errors++;
        continue;
      }

      console.log(`✅ ${projectNumber}: ${engagement.name}`);
      updated++;
    } catch (err) {
      console.error(`❌ ${projectNumber}: ${err.message}`);
      errors++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Not found: ${notFound}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📊 Total processed: ${records.length}`);
  console.log('');

  if (updated > 0) {
    console.log(`✨ Successfully imported ${updated} SharePoint folder links to ${envLabel}`);
  }
}

main().catch((err) => {
  console.error('\n❌ Import failed:', err);
  process.exit(1);
});
