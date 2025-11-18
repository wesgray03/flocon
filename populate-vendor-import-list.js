// Populate vendor import list from CSV
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
    console.log('Step 1: Run this SQL in Supabase SQL Editor first:\n');
    console.log('----------------------------------------');
    console.log(`
CREATE TABLE IF NOT EXISTS qbo_vendor_import_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qbo_vendor_import_list_name ON qbo_vendor_import_list(vendor_name);

ALTER TABLE qbo_vendor_import_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow authenticated users to read vendor import list"
  ON qbo_vendor_import_list FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated users to manage vendor import list"
  ON qbo_vendor_import_list FOR ALL TO authenticated USING (true) WITH CHECK (true);
    `);
    console.log('----------------------------------------\n');

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question(
      'Have you run the SQL above? (yes/no): ',
      async (answer) => {
        if (answer.toLowerCase() !== 'yes') {
          console.log('Please run the SQL first, then run this script again.');
          readline.close();
          return;
        }

        readline.close();

        console.log('\nStep 2: Populating vendor import list...\n');

        const csvPath = path.join(__dirname, 'vendors.csv');
        const vendorNames = parseCSV(csvPath);

        console.log(`Found ${vendorNames.length} vendors in CSV`);

        const records = vendorNames.map((name) => ({ vendor_name: name }));

        // Insert in batches of 100
        const batchSize = 100;
        let inserted = 0;

        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          const { data, error } = await supabase
            .from('qbo_vendor_import_list')
            .insert(batch)
            .select();

          if (error) {
            console.error(
              `Error inserting batch ${i / batchSize + 1}:`,
              error.message
            );
          } else {
            inserted += data.length;
            console.log(
              `✓ Inserted batch ${i / batchSize + 1}: ${data.length} vendors`
            );
          }
        }

        console.log(
          `\n✅ Complete! Inserted ${inserted} vendors into qbo_vendor_import_list`
        );

        // Verify
        const { count } = await supabase
          .from('qbo_vendor_import_list')
          .select('*', { count: 'exact', head: true });

        console.log(`Total vendors in table: ${count}`);
      }
    );
  } catch (error) {
    console.error('Error:', error.message);
  }
}

populateVendorList();
