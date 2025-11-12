#!/usr/bin/env node
/**
 * Transform engagement_parties CSV from old format to new format
 * Old: company_id, contact_id columns
 * New: party_id column (uses either company_id or contact_id value)
 */

import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(
  __dirname,
  'import-templates',
  'parsed',
  '06-engagement-parties.csv'
);
const outputFile = path.join(
  __dirname,
  'import-templates',
  'parsed',
  '06-engagement-parties-transformed.csv'
);

// Read and parse
const content = fs.readFileSync(inputFile, 'utf-8');
const records = parse(content, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

console.log(
  `📂 Read ${records.length} records from ${path.basename(inputFile)}`
);
console.log('First record structure:', Object.keys(records[0]));

// Transform records
const transformed = records.map((record) => {
  // Determine party_id based on party_type
  let party_id;
  if (record.party_type === 'company' && record.company_id) {
    party_id = record.company_id;
  } else if (record.party_type === 'contact' && record.contact_id) {
    party_id = record.contact_id;
  } else {
    console.warn(
      `⚠️  Record ${record.id}: No party_id could be determined (party_type=${record.party_type}, company_id=${record.company_id}, contact_id=${record.contact_id})`
    );
    party_id = null;
  }

  // Return new format
  return {
    id: record.id,
    engagement_id: record.engagement_id,
    party_type: record.party_type,
    party_id: party_id,
    role: record.role,
    is_primary: record.is_primary,
  };
});

console.log(`✅ Transformed ${transformed.length} records`);

// Check for any missing party_ids
const missing = transformed.filter((r) => !r.party_id);
if (missing.length > 0) {
  console.error(`❌ ${missing.length} records are missing party_id!`);
  missing.slice(0, 5).forEach((r) => {
    console.error(`   - ${r.id}: ${r.role} for engagement ${r.engagement_id}`);
  });
  process.exit(1);
}

// Write output
const output = stringify(transformed, {
  header: true,
  columns: [
    'id',
    'engagement_id',
    'party_type',
    'party_id',
    'role',
    'is_primary',
  ],
});

fs.writeFileSync(outputFile, output);

console.log(`✅ Wrote transformed data to ${path.basename(outputFile)}`);
console.log('\n📊 Summary:');
console.log(`   Input file:  ${inputFile}`);
console.log(`   Output file: ${outputFile}`);
console.log(`   Records:     ${transformed.length}`);
console.log('\n✅ Ready to import!');
