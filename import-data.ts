import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role key for bulk import
const supabase = createClient(supabaseUrl, supabaseKey);

interface ImportConfig {
  filename: string;
  tableName: string;
  description: string;
}

// Import order is CRITICAL - don't change without understanding foreign key dependencies
const importConfigs: ImportConfig[] = [
  {
    filename: '01-stages-template.csv',
    tableName: 'stages',
    description: 'Project stages',
  },
  {
    filename: '02-users-template.csv',
    tableName: 'users',
    description: 'User accounts',
  },
  {
    filename: '03-companies-template.csv',
    tableName: 'companies',
    description: 'Companies (customers, vendors, subcontractors)',
  },
  {
    filename: '04-contacts-template.csv',
    tableName: 'contacts',
    description: 'Company contacts',
  },
  {
    filename: '05-engagements-template.csv',
    tableName: 'engagements',
    description: 'Projects and prospects',
  },
  {
    filename: '06-engagement-parties-template.csv',
    tableName: 'engagement_parties',
    description: 'Engagement-company-contact relationships',
  },
  {
    filename: '07-engagement-user-roles-template.csv',
    tableName: 'engagement_user_roles',
    description: 'Engagement-user relationships',
  },
  {
    filename: '08-engagement-subcontractors-template.csv',
    tableName: 'engagement_subcontractors',
    description: 'Engagement-subcontractor assignments',
  },
  {
    filename: '09-engagement-change-orders-template.csv',
    tableName: 'engagement_change_orders',
    description: 'Change orders',
  },
  {
    filename: '10-engagement-pay-apps-template.csv',
    tableName: 'engagement_pay_apps',
    description: 'Payment applications',
  },
];

async function readCsvFile(filepath: string): Promise<any[]> {
  const fileContent = fs.readFileSync(filepath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return records;
}

function convertEmptyStringsToNull(record: any): any {
  const converted: any = {};
  for (const [key, value] of Object.entries(record)) {
    converted[key] = value === '' ? null : value;
  }
  return converted;
}

function convertBooleanStrings(record: any): any {
  const converted: any = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === 'true' || value === 't' || value === '1') {
      converted[key] = true;
    } else if (value === 'false' || value === 'f' || value === '0') {
      converted[key] = false;
    } else {
      converted[key] = value;
    }
  }
  return converted;
}

async function importTable(
  config: ImportConfig,
  dryRun: boolean = true
): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${config.description}`);
  console.log(`Table: ${config.tableName}`);
  console.log(`File: ${config.filename}`);
  console.log(`${'='.repeat(60)}`);

  const filepath = path.join(__dirname, 'import-templates', config.filename);

  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  File not found: ${filepath}`);
    console.log('   Skipping...');
    return;
  }

  try {
    // Read and parse CSV
    const records = await readCsvFile(filepath);
    console.log(`📊 Found ${records.length} records`);

    if (records.length === 0) {
      console.log('   No records to import');
      return;
    }

    // Show sample of first record
    console.log('\n📋 Sample record (first row):');
    console.log(JSON.stringify(records[0], null, 2));

    if (dryRun) {
      console.log('\n🔍 DRY RUN MODE - No data will be inserted');
      return;
    }

    // Process each record
    const processedRecords = records.map((record: any) => {
      let processed = convertEmptyStringsToNull(record);
      processed = convertBooleanStrings(processed);
      return processed;
    });

    // Insert data
    console.log('\n⬆️  Inserting data...');
    const { data, error } = await supabase
      .from(config.tableName)
      .insert(processedRecords)
      .select();

    if (error) {
      console.error(`❌ Error inserting into ${config.tableName}:`);
      console.error(error);
      throw error;
    }

    console.log(
      `✅ Successfully inserted ${data?.length || 0} records into ${config.tableName}`
    );
  } catch (error) {
    console.error(`❌ Failed to import ${config.filename}:`, error);
    throw error;
  }
}

async function verifyImports(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Verifying Imports');
  console.log('='.repeat(60));

  for (const config of importConfigs) {
    const { count, error } = await supabase
      .from(config.tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${config.tableName}: Error - ${error.message}`);
    } else {
      console.log(`✅ ${config.tableName}: ${count} records`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');

  console.log('\n' + '='.repeat(60));
  console.log('FLOCON DATA IMPORT SCRIPT');
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('\n🔍 Running in DRY RUN mode');
    console.log('   Add --execute flag to actually insert data');
    console.log('   Example: node import-data.js --execute');
  } else {
    console.log('\n⚠️  LIVE MODE - Data will be inserted into database!');
    console.log('   Press Ctrl+C within 5 seconds to cancel...');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  console.log(
    '\n📂 Import templates directory:',
    path.join(__dirname, 'import-templates')
  );

  try {
    for (const config of importConfigs) {
      await importTable(config, dryRun);
    }

    if (!dryRun) {
      await verifyImports();
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Import process completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Import process failed!');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

main();
