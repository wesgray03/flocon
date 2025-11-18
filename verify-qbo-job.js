#!/usr/bin/env node
// Verify job exists in QuickBooks
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const OAuthClient = require('intuit-oauth');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyJobInQBO() {
  console.log('🔍 Verifying job in QuickBooks...\n');

  // Get the synced project
  const { data: project } = await supabase
    .from('engagements')
    .select('name, project_number, qbo_customer_id, qbo_job_id')
    .eq('project_number', '1304')
    .single();

  if (!project || !project.qbo_job_id) {
    console.log('❌ No synced project found with number 1304');
    return;
  }

  console.log(`📋 Project: ${project.name} (${project.project_number})`);
  console.log(`   QB Customer ID: ${project.qbo_customer_id}`);
  console.log(`   QB Job ID: ${project.qbo_job_id}\n`);

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

  // Query the job in QB
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
    const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${tokenData.realm_id}/customer/${project.qbo_job_id}?minorversion=65`;

    const response = await oauthClient.makeApiCall({
      url,
      method: 'GET',
    });

    console.log('Response:', JSON.stringify(response, null, 2));

    const job = response.body?.Customer || response.json?.Customer || response;
    if (job && job.DisplayName) {
      console.log('✅ Job found in QuickBooks:');
      console.log(`   Display Name: ${job.DisplayName}`);
      console.log(`   Job: ${job.Job}`);
      console.log(`   Parent Customer ID: ${job.ParentRef?.value}`);
      console.log(`   Active: ${job.Active}`);
      console.log(`\n🔗 QuickBooks URL:`);
      console.log(
        `   https://sandbox.qbo.intuit.com/app/customerdetail?nameId=${job.Id}`
      );
    } else {
      console.log('❌ Unexpected response structure');
    }
  } catch (error) {
    console.error('❌ Error querying QuickBooks:', error.message);
    if (error.originalMessage) {
      console.error('   Details:', error.originalMessage);
    }
  }
}

verifyJobInQBO().catch(console.error);
