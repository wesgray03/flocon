#!/usr/bin/env node
/**
 * Verify QuickBooks migrations on production
 */

require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
  console.log('🔍 Verifying QuickBooks migrations on PRODUCTION\n');

  // Check qbo_tokens table
  console.log('1. Checking qbo_tokens table...');
  const { data: tokens, error: tokensError } = await supabase
    .from('qbo_tokens')
    .select('*')
    .limit(0);

  if (tokensError) {
    console.log(`   ❌ qbo_tokens table not found: ${tokensError.message}`);
  } else {
    console.log('   ✅ qbo_tokens table exists');
  }

  // Check engagements QB columns
  console.log('\n2. Checking engagements QB columns...');
  const { data: eng, error: engError } = await supabase
    .from('engagements')
    .select('qbo_customer_id, qbo_job_id, qbo_last_synced_at')
    .limit(1);

  if (engError) {
    console.log(`   ❌ QB columns not found: ${engError.message}`);
  } else {
    console.log('   ✅ qbo_customer_id, qbo_job_id, qbo_last_synced_at exist');
  }

  // Check engagement_pay_apps QB columns
  console.log('\n3. Checking engagement_pay_apps QB columns...');
  const { data: payApps, error: payAppsError } = await supabase
    .from('engagement_pay_apps')
    .select(
      'qbo_invoice_id, qbo_sync_status, qbo_synced_at, qbo_payment_total, qbo_sync_error'
    )
    .limit(1);

  if (payAppsError) {
    console.log(`   ❌ QB columns not found: ${payAppsError.message}`);
  } else {
    console.log('   ✅ All QB columns exist on engagement_pay_apps');
  }

  // Check companies QB columns
  console.log('\n4. Checking companies QB columns...');
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('qbo_customer_id, qbo_last_synced_at')
    .limit(1);

  if (companiesError) {
    console.log(`   ❌ QB columns not found: ${companiesError.message}`);
  } else {
    console.log('   ✅ qbo_customer_id, qbo_last_synced_at exist');
  }

  // Check qbo_vendor_import_list
  console.log('\n5. Checking qbo_vendor_import_list table...');
  const { data: vendors, error: vendorsError } = await supabase
    .from('qbo_vendor_import_list')
    .select('*')
    .limit(0);

  if (vendorsError) {
    console.log(
      `   ❌ qbo_vendor_import_list not found: ${vendorsError.message}`
    );
  } else {
    console.log('   ✅ qbo_vendor_import_list table exists');
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Verification complete!');
  console.log('='.repeat(70));
}

verify().catch(console.error);
