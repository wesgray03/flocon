// Check how many vendors are in QuickBooks
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const OAuthClient = require('intuit-oauth');

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
  return { client: oauthClient, realmId: tokenData.realmId };
}

async function makeQBORequest(method, endpoint, body) {
  const { client, realmId } = await getQBOClient();
  const token = client.getToken();

  const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/${endpoint}`;

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
}

async function checkVendorCount() {
  try {
    console.log('Checking QuickBooks vendors...\n');
    console.log('='.repeat(60));

    // Get all vendors
    const query = 'SELECT * FROM Vendor MAXRESULTS 1000';
    const data = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(query)}`
    );

    const allVendors = data.QueryResponse?.Vendor || [];
    const activeVendors = allVendors.filter((v) => v.Active !== false);
    const vendors1099 = allVendors.filter((v) => v.Vendor1099 === true);
    const activeAnd1099 = allVendors.filter(
      (v) => v.Active !== false && v.Vendor1099 === true
    );

    console.log('VENDOR COUNTS:');
    console.log('='.repeat(60));
    console.log(`Total Vendors: ${allVendors.length}`);
    console.log(`Active Vendors: ${activeVendors.length}`);
    console.log(`1099 Vendors: ${vendors1099.length}`);
    console.log(`Active + 1099: ${activeAnd1099.length}`);
    console.log('='.repeat(60));

    // Show sample vendors
    console.log('\nSample Vendors (first 10):');
    allVendors.slice(0, 10).forEach((v, i) => {
      const status = v.Active === false ? 'Inactive' : 'Active';
      const is1099 = v.Vendor1099 ? '(1099)' : '';
      console.log(
        `  ${i + 1}. ${v.DisplayName || v.CompanyName} - ${status} ${is1099}`
      );
    });

    // Show 1099 vendors
    if (vendors1099.length > 0) {
      console.log(`\nAll 1099 Vendors (${vendors1099.length}):`);
      vendors1099.forEach((v, i) => {
        const status = v.Active === false ? 'Inactive' : 'Active';
        console.log(
          `  ${i + 1}. ${v.DisplayName || v.CompanyName} - ${status}`
        );
      });
    }

    console.log('\n' + '='.repeat(60));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkVendorCount();
