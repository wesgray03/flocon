#!/usr/bin/env node
// Check for Projects in QuickBooks
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const OAuthClient = require('intuit-oauth');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkQBOProjects() {
  console.log('🔍 Checking QuickBooks for Projects...\n');

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
    // Query for all customers where IsProject = true
    console.log('Searching for IsProject = true...');
    const query = `SELECT * FROM Customer WHERE IsProject = true`;
    const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${tokenData.realm_id}/query?query=${encodeURIComponent(query)}&minorversion=65`;

    const response = await oauthClient.makeApiCall({
      url,
      method: 'GET',
    });

    const projects = response.json?.QueryResponse?.Customer || [];

    if (projects.length === 0) {
      console.log('❌ No Projects found (IsProject = true)');
      console.log(
        '   This might be a sandbox limitation or Projects feature not enabled\n'
      );
    } else {
      console.log(`✅ Found ${projects.length} Project(s):\n`);
      projects.forEach((p) => {
        console.log(`   📋 ${p.DisplayName}`);
        console.log(`      ID: ${p.Id}`);
        console.log(`      IsProject: ${p.IsProject}`);
        console.log(`      Parent: ${p.ParentRef?.value || 'None'}`);
        console.log('');
      });
    }

    // Also check all sub-customers (jobs)
    console.log('Checking all sub-customers (Job = true)...');
    const jobQuery = `SELECT * FROM Customer WHERE Job = true`;
    const jobUrl = `https://sandbox-quickbooks.api.intuit.com/v3/company/${tokenData.realm_id}/query?query=${encodeURIComponent(jobQuery)}&minorversion=65`;

    const jobResponse = await oauthClient.makeApiCall({
      url: jobUrl,
      method: 'GET',
    });

    const jobs = jobResponse.json?.QueryResponse?.Customer || [];
    console.log(`\n✅ Found ${jobs.length} sub-customer(s):\n`);
    jobs.forEach((j) => {
      console.log(`   📋 ${j.DisplayName}`);
      console.log(`      ID: ${j.Id}`);
      console.log(`      IsProject: ${j.IsProject}`);
      console.log(`      BillWithParent: ${j.BillWithParent}`);
      console.log(`      Parent: ${j.ParentRef?.value || 'None'}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error querying QuickBooks:', error.message);
    if (error.originalMessage) {
      console.error('   Details:', error.originalMessage);
    }
  }
}

checkQBOProjects().catch(console.error);
