// Test customer name update in QuickBooks
// This script will:
// 1. Show current customer name in QB
// 2. Change company name in FloCon
// 3. Sync the project
// 4. Verify customer name updated in QB
// 5. Restore original name

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
  return { client: oauthClient, realmId: tokenData.realmId };
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

async function testCustomerNameUpdate() {
  try {
    // Use a test company - find one with synced projects
    console.log('Finding a test company with synced projects...\n');

    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, qbo_id')
      .not('qbo_id', 'is', null)
      .limit(1)
      .single();

    if (!companies) {
      console.log('No companies with QB IDs found. Run sync first.');
      return;
    }

    const originalName = companies.name;
    const testName = `${originalName} (TEST NAME CHANGE)`;
    const companyId = companies.id;
    const qboId = companies.qbo_id;

    console.log(`Test Company: ${originalName}`);
    console.log(`QB ID: ${qboId}`);
    console.log(`Company ID: ${companyId}\n`);

    // Step 1: Get current QB customer
    console.log('Step 1: Fetching current QB customer...');
    const qbCustomerBefore = await makeQBORequest('GET', `customer/${qboId}`);
    console.log(
      `  Current QB Name: "${qbCustomerBefore.Customer.DisplayName}"\n`
    );

    // Step 2: Update company name in FloCon
    console.log('Step 2: Updating company name in FloCon...');
    const { error: updateError } = await supabase
      .from('companies')
      .update({ name: testName })
      .eq('id', companyId);

    if (updateError) throw updateError;
    console.log(`  New FloCon Name: "${testName}"\n`);

    // Step 3: Find a project for this company and sync it
    console.log('Step 3: Finding and syncing a project...');
    const { data: party } = await supabase
      .from('engagement_parties')
      .select('engagement_id')
      .eq('party_id', companyId)
      .eq('party_type', 'company')
      .eq('role', 'customer')
      .limit(1)
      .single();

    if (!party) {
      console.log('No projects found for this company');
      return;
    }

    // Import and run sync directly
    const { syncEngagementToQBO } = require('./src/lib/qboSync.ts');
    const syncResult = await syncEngagementToQBO(party.engagement_id);

    console.log(
      `  Sync Result: ${syncResult.success ? '✓ Success' : '✗ Failed'}`
    );
    if (syncResult.error) console.log(`  Error: ${syncResult.error}`);
    console.log();

    // Step 4: Check QB customer again
    console.log('Step 4: Verifying QB customer name updated...');
    const qbCustomerAfter = await makeQBORequest('GET', `customer/${qboId}`);
    console.log(
      `  Updated QB Name: "${qbCustomerAfter.Customer.DisplayName}"\n`
    );

    // Step 5: Restore original name
    console.log('Step 5: Restoring original name...');
    await supabase
      .from('companies')
      .update({ name: originalName })
      .eq('id', companyId);

    // Sync again to restore in QB
    await syncEngagementToQBO(party.engagement_id);

    const qbCustomerRestored = await makeQBORequest('GET', `customer/${qboId}`);
    console.log(
      `  Restored QB Name: "${qbCustomerRestored.Customer.DisplayName}"\n`
    );

    console.log('='.repeat(60));
    console.log('TEST RESULTS:');
    console.log(`Original Name: "${originalName}"`);
    console.log(`Test Name: "${testName}"`);
    console.log(`QB Before Sync: "${qbCustomerBefore.Customer.DisplayName}"`);
    console.log(`QB After Sync: "${qbCustomerAfter.Customer.DisplayName}"`);
    console.log(
      `QB After Restore: "${qbCustomerRestored.Customer.DisplayName}"`
    );
    console.log();
    console.log(
      `✓ Test ${qbCustomerAfter.Customer.DisplayName === testName ? 'PASSED' : 'FAILED'}`
    );
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testCustomerNameUpdate();
