// Populate vendor import list (after table is created in Supabase)
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function parseCSV(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  const vendors = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const matches = line.match(/(?:^|,)("(?:[^"]*(?:""[^"]*)*)"|[^,]*)/g);
    if (!matches || matches.length < 1) continue;

    const vendor = matches[0].replace(/^,?"?|"?$/g, '');
    if (vendor) {
      vendors.push(vendor.trim());
    }
  }

  return vendors;
}

async function populateVendorList() {
  try {
    console.log('Populating vendor import list from CSV...\n');

    const csvPath = path.join(__dirname, 'vendors.csv');
    const vendorNames = parseCSV(csvPath);

    console.log(`Found ${vendorNames.length} vendors in CSV\n`);

    const records = vendorNames.map((name) => ({ vendor_name: name }));

    // Insert in batches
    const batchSize = 50;
    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('qbo_vendor_import_list')
        .insert(batch)
        .select();

      if (error) {
        if (error.message.includes('duplicate')) {
          console.log(
            `⚠️  Batch ${Math.floor(i / batchSize) + 1}: Some vendors already exist`
          );
          skipped += batch.length;
        } else {
          console.error(
            `❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`,
            error.message
          );
        }
      } else {
        inserted += data.length;
        console.log(
          `✓ Batch ${Math.floor(i / batchSize) + 1}: ${data.length} vendors`
        );
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Complete!`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Skipped: ${skipped}`);
    console.log('='.repeat(60));

    // Verify
    const { count } = await supabase
      .from('qbo_vendor_import_list')
      .select('*', { count: 'exact', head: true });

    console.log(`\nTotal vendors in qbo_vendor_import_list table: ${count}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

populateVendorList();
