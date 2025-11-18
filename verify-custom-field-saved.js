// Check if custom field updates actually saved in QuickBooks
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

async function checkCustomFieldStatus() {
  try {
    console.log('Checking if custom field updates saved...\n');

    // Get a vendor we updated (e.g., ID 142 - "Lowe's")
    console.log(
      'Getting vendor by ID (should show CustomField if it saved)...'
    );
    const vendorData = await makeQBORequest('GET', 'vendor/142');

    console.log('\nVendor 142 (Lowes) full response:');
    console.log(JSON.stringify(vendorData, null, 2));

    if (vendorData.Vendor.CustomField) {
      console.log('\n✓ CustomField found!');
      console.log('Custom fields:', vendorData.Vendor.CustomField);
    } else {
      console.log('\n✗ No CustomField property in response');
      console.log('This means either:');
      console.log('  1. The custom field updates did not save');
      console.log(
        '  2. QB Online does not support custom fields on Vendor entities'
      );
      console.log('  3. Custom fields require different setup/access method');
    }

    // Also check the vendor we just created/updated
    console.log('\n\nChecking another vendor (360Training - ID 141)...');
    const vendor2Data = await makeQBORequest('GET', 'vendor/141');

    if (vendor2Data.Vendor.CustomField) {
      console.log('✓ CustomField found on 360Training');
    } else {
      console.log('✗ No CustomField on 360Training either');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCustomFieldStatus();
