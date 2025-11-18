// Update FloCon Import custom field for vendors
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

  // Skip header, get vendor names
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

async function getAllVendors() {
  const response = await makeQBORequest(
    'GET',
    'query?query=SELECT * FROM Vendor MAXRESULTS 1000'
  );
  return response.QueryResponse.Vendor || [];
}

async function updateVendor(vendor, setCustomField) {
  try {
    // Add or update the custom field
    const vendorData = {
      ...vendor,
      CustomField: [
        {
          DefinitionId: '1', // This is typically 1 for the first custom field, may need to verify
          Name: 'FloCon Import',
          Type: 'StringType',
          StringValue: setCustomField ? 'true' : '',
        },
      ],
      sparse: true,
    };

    const response = await makeQBORequest('POST', 'vendor', vendorData);
    return { success: true, vendor: response.Vendor };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function updateVendorCustomFields() {
  try {
    const csvPath = path.join(__dirname, 'vendors.csv');

    if (!fs.existsSync(csvPath)) {
      console.error(`CSV file not found: ${csvPath}`);
      console.log('Please place "vendors.csv" in the project root directory');
      process.exit(1);
    }

    console.log('Updating vendor custom fields in QuickBooks...\n');
    console.log('='.repeat(60));

    // Get list of vendors to mark as FloCon Import = true
    const vendorsToImport = parseCSV(csvPath);
    console.log(`Found ${vendorsToImport.length} vendors in CSV to mark\n`);

    // Get all vendors from QB
    console.log('Fetching all vendors from QuickBooks...');
    const allVendors = await getAllVendors();
    console.log(`Found ${allVendors.length} total vendors in QuickBooks\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const vendor of allVendors) {
      const shouldImport = vendorsToImport.some(
        (name) =>
          name.toLowerCase().trim() === vendor.DisplayName.toLowerCase().trim()
      );

      if (shouldImport) {
        process.stdout.write(
          `Setting FloCon Import=true for: ${vendor.DisplayName}...`
        );

        const result = await updateVendor(vendor, true);

        if (result.success) {
          console.log(` ✓ Updated`);
          updated++;
        } else {
          console.log(` ✗ Error: ${result.error}`);
          errors++;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else {
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('UPDATE COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total vendors in QB: ${allVendors.length}`);
    console.log(`Marked for import: ${updated}`);
    console.log(`Skipped (not in list): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  }
}

updateVendorCustomFields();
