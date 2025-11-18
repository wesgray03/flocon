// Test pulling vendors from QuickBooks using database import list
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
    environment: 'sandbox',
    redirectUri: process.env.QBO_REDIRECT_URI,
  });

  oauthClient.setToken(tokenData);
  return { client: oauthClient, realmId: tokenData.realm_id };
}

async function makeQBORequest(method, endpoint) {
  const { client, realmId } = await getQBOClient();
  const token = client.getToken();

  const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QBO API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function testVendorPull() {
  try {
    console.log('Testing vendor pull with database import list...\n');
    console.log('='.repeat(60));

    // Check vendors in FloCon before pull
    const { data: vendorsBefore, count: countBefore } = await supabase
      .from('companies')
      .select('*', { count: 'exact' })
      .eq('is_vendor', true);

    console.log(`\nVendors in FloCon before pull: ${countBefore || 0}`);

    // Get vendor list from database
    const { data: vendorList } = await supabase
      .from('qbo_vendor_import_list')
      .select('vendor_name');

    const vendorNames = (vendorList || []).map((v) =>
      v.vendor_name.toLowerCase().trim()
    );

    console.log(`Vendors in import list: ${vendorNames.length}`);

    // Query all vendors from QB
    const query = 'SELECT * FROM Vendor MAXRESULTS 1000';
    const data = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(query)}`
    );

    const allVendors = data.QueryResponse?.Vendor || [];

    // Filter by import list
    const vendorsToImport = allVendors.filter((v) => {
      const displayName = (v.DisplayName || '').toLowerCase().trim();
      return vendorNames.includes(displayName);
    });

    console.log(`\nTotal vendors in QuickBooks: ${allVendors.length}`);
    console.log(`Vendors to import (matching list): ${vendorsToImport.length}`);

    if (vendorsToImport.length > 0) {
      console.log('\nFirst 5 vendors to import:');
      vendorsToImport.slice(0, 5).forEach((v) => {
        console.log(`  - ${v.DisplayName} (ID: ${v.Id})`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test complete - ready to pull vendors!');
    console.log('='.repeat(60));
    console.log('\nYou can now:');
    console.log('1. Test via API: POST /api/qbo/pull-vendors');
    console.log(
      '2. Test via UI: Click "Pull from QuickBooks" in Contractors modal'
    );
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testVendorPull();
