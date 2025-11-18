// Test QB connection before bulk import
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const OAuthClient = require('intuit-oauth');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  try {
    console.log('Testing QuickBooks connection...\n');

    // Get token
    const { data: tokenData } = await supabase
      .from('qbo_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!tokenData) {
      console.error('❌ No QB token found in database');
      return;
    }

    console.log('✓ Token found in database');
    console.log(`  Realm ID: ${tokenData.realmId}`);
    console.log(
      `  Created: ${new Date(tokenData.created_at).toLocaleString()}`
    );

    // Try a simple query
    const oauthClient = new OAuthClient({
      clientId: process.env.QBO_CLIENT_ID,
      clientSecret: process.env.QBO_CLIENT_SECRET,
      environment: process.env.QBO_ENVIRONMENT || 'sandbox',
      redirectUri: process.env.QBO_REDIRECT_URI,
    });

    oauthClient.setToken(tokenData);
    const token = oauthClient.getToken();

    console.log('\n✓ OAuth client initialized');
    console.log(`  Access token: ${token.access_token.substring(0, 20)}...`);

    // Test with CompanyInfo query (simple, doesn't create anything)
    const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${tokenData.realmId}/companyinfo/${tokenData.realmId}`;

    console.log('\nTesting API request...');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error: ${response.status} - ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log('✓ API request successful');
    console.log(`  Company: ${data.CompanyInfo.CompanyName}`);
    console.log('\n✅ QuickBooks connection is working!');
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error);
  }
}

testConnection();
