// Import vendors from CSV into QuickBooks sandbox
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const OAuthClient = require('intuit-oauth');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getQBOClient() {
  const { data: tokenData } = await supabase
    .from('qbo_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!tokenData) throw new Error('No QB token found');

  const oauthClient = new OAuthClient({
    clientId: process.env.QBO_CLIENT_ID,
    clientSecret: process.env.QBO_CLIENT_SECRET,
    environment: process.env.QBO_ENVIRONMENT || 'sandbox',
    redirectUri: process.env.QBO_REDIRECT_URI,
  });

  oauthClient.setToken(tokenData);
  return { client: oauthClient, realmId: tokenData.realm_id };
}

async function makeQBORequest(method, endpoint, body) {
  const { client, realmId } = await getQBOClient();
  const token = client.getToken();

  const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`QBO API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
}

function parseCSV(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  // Skip header
  const vendors = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Handle CSV with quoted fields
    const matches = line.match(/(?:^|,)("(?:[^"]*(?:""[^"]*)*)"|[^,]*)/g);
    if (!matches || matches.length < 3) continue;

    const vendor = matches[0].replace(/^,?"?|"?$/g, '');
    const projectVendor = matches[2]
      ? matches[2].replace(/^,?"?|"?$/g, '').toUpperCase() === 'TRUE'
      : false;

    if (vendor) {
      vendors.push({ name: vendor, isProjectVendor: projectVendor });
    }
  }

  return vendors;
}

async function createVendor(name, isProjectVendor) {
  const vendorData = {
    DisplayName: name,
    CompanyName: name,
    Vendor1099: isProjectVendor, // Set 1099 tracking for project vendors
  };

  try {
    const response = await makeQBORequest('POST', 'vendor', vendorData);
    return { success: true, vendor: response.Vendor };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function importVendors() {
  try {
    const csvPath = path.join(__dirname, 'vendors.csv');

    if (!fs.existsSync(csvPath)) {
      console.error(`CSV file not found: ${csvPath}`);
      console.log('Please place "vendors.csv" in the project root directory');
      process.exit(1);
    }

    console.log('Importing vendors from CSV...\n');
    console.log('='.repeat(60));

    const vendors = parseCSV(csvPath);
    console.log(`Found ${vendors.length} vendors in CSV\n`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const vendor of vendors) {
      const projectFlag = vendor.isProjectVendor ? '(Project Vendor)' : '';
      process.stdout.write(`Creating: ${vendor.name} ${projectFlag}...`);

      const result = await createVendor(vendor.name, vendor.isProjectVendor);

      if (result.success) {
        console.log(` ✓ Created (ID: ${result.vendor.Id})`);
        created++;
      } else if (result.error.includes('duplicate')) {
        console.log(` ⚠️  Already exists`);
        skipped++;
      } else {
        console.log(` ✗ Error: ${result.error}`);
        errors++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('\n' + '='.repeat(60));
    console.log('IMPORT COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total: ${vendors.length}`);
    console.log(`Created: ${created}`);
    console.log(`Skipped (duplicates): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log('='.repeat(60));

    const projectVendorCount = vendors.filter((v) => v.isProjectVendor).length;
    console.log(`\nProject Vendors (1099): ${projectVendorCount}`);
    console.log(`Other Vendors: ${vendors.length - projectVendorCount}`);
  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

importVendors();
