// Search for all QB projects with 1271 in the name
const { createClient } = require('@supabase/supabase-js');
const OAuthClient = require('intuit-oauth');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function searchQBProjects() {
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

  console.log('Searching for all projects with "1271" in QuickBooks...\n');

  const query = `SELECT * FROM Customer WHERE Job = true AND DisplayName LIKE '%1271%' AND Active IN (true, false)`;

  const response = await fetch(
    `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    }
  );

  const data = await response.json();

  if (data.QueryResponse?.Customer?.length > 0) {
    console.log(`Found ${data.QueryResponse.Customer.length} project(s):\n`);
    for (const project of data.QueryResponse.Customer) {
      console.log(`  ID: ${project.Id}`);
      console.log(`  Name: ${project.DisplayName}`);
      console.log(`  Active: ${project.Active}`);
      console.log(`  Parent: ${project.ParentRef?.value || 'N/A'}`);
      console.log('');
    }
  } else {
    console.log('No projects found with "1271" in the name');
  }
}

searchQBProjects().catch(console.error);
