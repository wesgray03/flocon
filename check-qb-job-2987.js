// Check QB project name for Job ID 2987
const OAuthClient = require('intuit-oauth');
require('dotenv').config({ path: '.env.production.local' });

async function checkQBProject() {
  const oauthClient = new OAuthClient({
    clientId: process.env.QBO_CLIENT_ID,
    clientSecret: process.env.QBO_CLIENT_SECRET,
    environment: process.env.QBO_ENVIRONMENT || 'production',
    redirectUri: process.env.QBO_REDIRECT_URI,
  });

  // Get tokens from database
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: tokenData } = await supabase
    .from('qbo_tokens')
    .select('*')
    .eq('is_active', true)
    .single();

  if (!tokenData) {
    console.error('No active QB tokens found');
    return;
  }

  oauthClient.setToken({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    token_type: 'bearer',
  });

  const realmId = tokenData.realm_id;
  const environment = process.env.QBO_ENVIRONMENT || 'production';
  const baseUrl =
    environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';

  const jobId = process.argv[2] || '2987';
  console.log(`Fetching QB Job ID ${jobId}...\n`);

  const response = await fetch(
    `${baseUrl}/v3/company/${realmId}/customer/${jobId}`,
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    }
  );

  const data = await response.json();

  if (data.Customer) {
    const customer = data.Customer;
    console.log('QuickBooks Project Details:');
    console.log(`  ID: ${customer.Id}`);
    console.log(`  Display Name: ${customer.DisplayName}`);
    console.log(`  Is Job: ${customer.Job || false}`);
    console.log(`  Active: ${customer.Active}`);
    console.log(`  Parent Customer ID: ${customer.ParentRef?.value || 'N/A'}`);

    if (customer.ParentRef?.value) {
      console.log(`\nFetching parent customer...`);
      const parentResponse = await fetch(
        `${baseUrl}/v3/company/${realmId}/customer/${customer.ParentRef.value}`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/json',
          },
        }
      );
      const parentData = await parentResponse.json();
      if (parentData.Customer) {
        console.log(`  Parent Name: ${parentData.Customer.DisplayName}`);
      }
    }
  } else {
    console.log('Project not found or error:', data);
  }
}

checkQBProject().catch(console.error);
