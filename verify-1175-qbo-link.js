// Verify project 1175 QB connection
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyProject() {
  console.log('Checking project 1175 in database...\n');

  const { data, error } = await supabase
    .from('engagements')
    .select(
      'id, project_number, name, qbo_customer_id, qbo_job_id, qbo_last_synced_at'
    )
    .eq('project_number', '1175')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Project 1175:');
  console.log(`  Name: ${data.name}`);
  console.log(`  QB Customer ID: ${data.qbo_customer_id || 'NOT SET'}`);
  console.log(`  QB Job ID: ${data.qbo_job_id || 'NOT SET'}`);
  console.log(`  Last Synced: ${data.qbo_last_synced_at || 'NEVER'}`);

  if (data.qbo_job_id) {
    console.log(`\n✅ Project is linked to QB Job ID: ${data.qbo_job_id}`);
    return data.qbo_job_id;
  } else {
    console.log('\n⚠️  Project is not linked to QuickBooks yet.');
    return null;
  }
}

async function checkQBProject(jobId) {
  if (!jobId) return;

  const OAuthClient = require('intuit-oauth');
  const oauthClient = new OAuthClient({
    clientId: process.env.QBO_CLIENT_ID,
    clientSecret: process.env.QBO_CLIENT_SECRET,
    environment: process.env.QBO_ENVIRONMENT || 'production',
    redirectUri: process.env.QBO_REDIRECT_URI,
  });

  const { data: tokenData } = await supabase
    .from('qbo_tokens')
    .select('*')
    .eq('is_active', true)
    .single();

  if (!tokenData) {
    console.error('No active QB tokens found');
    return;
  }

  const realmId = tokenData.realm_id;
  const environment = process.env.QBO_ENVIRONMENT || 'production';
  const baseUrl =
    environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';

  console.log(`\nFetching QB Job ID ${jobId}...\n`);

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

async function run() {
  const jobId = await verifyProject();
  if (jobId) {
    await checkQBProject(jobId);
  }
}

run().catch(console.error);
