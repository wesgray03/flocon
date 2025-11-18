// Check vendor custom field structure
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

async function makeQBORequest(method, endpoint) {
  const { client, realmId } = await getQBOClient();
  const token = client.getToken();

  const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/${endpoint}`;

  try {
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
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
}

async function checkVendorStructure() {
  try {
    console.log('Checking vendor custom field structure...\n');

    // Get first 3 vendors
    const query = 'SELECT * FROM Vendor MAXRESULTS 3';
    const data = await makeQBORequest(
      'GET',
      `query?query=${encodeURIComponent(query)}`
    );

    const vendors = data.QueryResponse?.Vendor || [];

    if (vendors.length > 0) {
      console.log(`Found ${vendors.length} vendors`);
      console.log('\nFirst vendor structure:');
      console.log(JSON.stringify(vendors[0], null, 2));
    } else {
      console.log('No vendors found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkVendorStructure();
