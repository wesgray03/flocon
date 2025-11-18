// Get specific vendor by ID to see custom fields
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const OAuthClient = require('intuit-oauth');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getVendorById(vendorId) {
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
  const token = oauthClient.getToken();

  const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${tokenData.realm_id}/vendor/${vendorId}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

getVendorById('141');
