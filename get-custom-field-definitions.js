// Get custom field definitions from QuickBooks
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

async function getCustomFieldDefinitions() {
  try {
    console.log('Checking for custom field definitions in QuickBooks...\n');

    // Try querying for Preferences (which contains custom field definitions)
    console.log('1. Checking Preferences...');
    try {
      const prefs = await makeQBORequest('GET', 'preferences');
      console.log('Preferences response:');
      console.log(JSON.stringify(prefs, null, 2));
    } catch (err) {
      console.log('Could not get preferences:', err.message);
    }

    // Try querying CompanyInfo
    console.log('\n2. Checking CompanyInfo...');
    try {
      const { realmId } = await getQBOClient();
      const companyInfo = await makeQBORequest('GET', `companyinfo/${realmId}`);
      console.log('CompanyInfo response (may contain custom field info):');
      console.log(JSON.stringify(companyInfo, null, 2));
    } catch (err) {
      console.log('Could not get company info:', err.message);
    }

    console.log('\n3. Trying to query for CustomField entities...');
    try {
      const customFields = await makeQBORequest(
        'GET',
        'query?query=SELECT * FROM CustomField'
      );
      console.log('CustomField query response:');
      console.log(JSON.stringify(customFields, null, 2));
    } catch (err) {
      console.log('CustomField query failed:', err.message);
    }

    console.log(
      '\n\nNOTE: QuickBooks Online API has limited support for custom fields.'
    );
    console.log(
      'Custom fields created in the UI may not be accessible via API.'
    );
    console.log(
      'The API primarily supports custom fields on transactions (Invoice, Bill, etc.)'
    );
    console.log('not on entities like Vendor, Customer, etc.');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getCustomFieldDefinitions();
