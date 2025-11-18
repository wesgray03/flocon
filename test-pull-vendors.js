// Test pulling vendors filtered by FloCon Import custom field
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

async function testVendorPull() {
  try {
    console.log('Testing vendor pull with FloCon Import filter...\n');
    console.log('='.repeat(60));

    // Count vendors in FloCon before pull
    const { data: vendorsBefore, error: vendorsBeforeError } = await supabase
      .from('companies')
      .select('id, name, company_type, is_vendor')
      .eq('is_vendor', true);

    if (vendorsBeforeError) throw vendorsBeforeError;

    console.log(
      `\nVendors in FloCon before pull: ${vendorsBefore?.length || 0}`
    );

    // Query all vendors from QB
    const query = 'SELECT * FROM Vendor MAXRESULTS 1000';
    const data = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(query)}`
    );

    const allVendors = data.QueryResponse?.Vendor || [];

    // Filter by FloCon Import custom field
    const vendorsToImport = allVendors.filter((v) => {
      const customField = v.CustomField?.find(
        (f) => f.Name === 'FloCon Import'
      );
      return customField?.StringValue === 'true';
    });

    console.log(`\nTotal vendors in QuickBooks: ${allVendors.length}`);
    console.log(
      `Vendors marked for import (FloCon Import = true): ${vendorsToImport.length}`
    );

    if (vendorsToImport.length > 0) {
      console.log('\nFirst 5 vendors to import:');
      vendorsToImport.slice(0, 5).forEach((v) => {
        console.log(`  - ${v.DisplayName} (ID: ${v.Id})`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('Test complete - ready for actual pull!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  }
}

testVendorPull();
