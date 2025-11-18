#!/usr/bin/env node
// Compare "test 2" project with others to see why it shows up differently
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const OAuthClient = require('intuit-oauth');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function compareProjects() {
  console.log('🔍 Comparing QB Projects...\n');

  // Get QB token
  const { data: tokenData } = await supabase
    .from('qbo_tokens')
    .select('*')
    .eq('is_active', true)
    .single();

  if (!tokenData) {
    console.log('❌ No active QB connection');
    return;
  }

  const oauthClient = new OAuthClient({
    clientId: process.env.QBO_CLIENT_ID,
    clientSecret: process.env.QBO_CLIENT_SECRET,
    environment: 'sandbox',
    redirectUri: process.env.QBO_REDIRECT_URI,
  });

  oauthClient.token.setToken({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: 3600,
    x_refresh_token_expires_in: 8726400,
    token_type: 'bearer',
  });

  try {
    // Get specific projects to compare
    const projectIds = [63, 60, 65, 67]; // test 2, 1400, 1402, 1304

    console.log('Fetching project details...\n');

    for (const id of projectIds) {
      const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${tokenData.realm_id}/customer/${id}?minorversion=65`;

      const response = await oauthClient.makeApiCall({
        url,
        method: 'GET',
      });

      const project = response.json?.Customer;

      if (project) {
        console.log(`📋 ${project.DisplayName} (ID: ${project.Id})`);
        console.log(`   Job: ${project.Job}`);
        console.log(`   IsProject: ${project.IsProject}`);
        console.log(`   BillWithParent: ${project.BillWithParent}`);
        console.log(`   Level: ${project.Level}`);
        console.log(`   ParentRef: ${project.ParentRef?.value || 'None'}`);
        console.log(`   FullyQualifiedName: ${project.FullyQualifiedName}`);
        console.log(`   Active: ${project.Active}`);
        console.log(`   MetaData.CreateTime: ${project.MetaData?.CreateTime}`);
        console.log(
          `   MetaData.LastUpdatedTime: ${project.MetaData?.LastUpdatedTime}`
        );
        console.log(`   SyncToken: ${project.SyncToken}`);

        // Check for any additional fields that might differ
        const specialFields = ['ProjectStatus', 'CompletedDate', 'Description'];
        specialFields.forEach((field) => {
          if (project[field]) {
            console.log(`   ${field}: ${project[field]}`);
          }
        });

        console.log('');
      }
    }

    // Now query to see what QB returns when filtering for projects
    console.log('🔍 Testing different query filters...\n');

    const queries = [
      'SELECT * FROM Customer WHERE IsProject = true',
      'SELECT * FROM Customer WHERE Job = true AND IsProject = true',
      'SELECT * FROM Customer WHERE Job = true AND BillWithParent = true',
    ];

    for (const query of queries) {
      console.log(`Query: ${query}`);
      const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${tokenData.realm_id}/query?query=${encodeURIComponent(query)}&minorversion=65`;

      const response = await oauthClient.makeApiCall({
        url,
        method: 'GET',
      });

      const results = response.json?.QueryResponse?.Customer || [];
      console.log(`   Results: ${results.length} projects`);
      results.forEach((p) => {
        console.log(`      - ${p.DisplayName} (ID: ${p.Id})`);
      });
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

compareProjects().catch(console.error);
