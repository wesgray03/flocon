require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.production.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSync() {
  console.log('Testing QB sync for project 1292...\n');

  // Get project details
  const { data: engagement, error: engError } = await supabase
    .from('engagements')
    .select('*')
    .eq('project_number', '1292')
    .single();

  if (engError) {
    console.error('Error fetching engagement:', engError);
    return;
  }

  // Get customer separately
  const { data: customer, error: customerError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', engagement.customer_id)
    .single();

  if (customerError) {
    console.error('Error fetching customer:', customerError);
  }

  console.log('Project:', engagement.project_number);
  console.log('Customer:', customer?.name || 'Unknown');
  console.log('QB Job ID:', engagement.qbo_job_id || 'NOT SET');
  console.log('QB Customer ID:', customer?.qbo_id || 'NOT SET');
  console.log();

  // Get pay apps for this project
  const { data: payApps, error: payAppsError } = await supabase
    .from('engagement_pay_apps')
    .select('*')
    .eq('engagement_id', engagement.id)
    .order('pay_app_number', { ascending: true });

  if (payAppsError) {
    console.error('Error fetching pay apps:', payAppsError);
    return;
  }

  console.log(`Found ${payApps.length} pay apps:\n`);
  payApps.forEach((pa) => {
    console.log(`Pay App #${pa.pay_app_number}`);
    console.log(`  Amount: $${pa.amount || 0}`);
    console.log(`  Status: ${pa.status}`);
    console.log(`  QB Invoice ID: ${pa.qbo_invoice_id || 'None'}`);
    console.log(`  QB Sync Status: ${pa.qbo_sync_status || 'None'}`);
    console.log();
  });

  // Check if project has QB job ID
  if (!engagement.qbo_job_id) {
    console.log('⚠️  WARNING: Project does not have a QB job ID.');
    console.log(
      '   The project must be synced to QB first before pay apps can be synced.'
    );
    console.log(
      '   Check the Projects page to see if project has been synced.'
    );
  }

  if (!customer?.qbo_id) {
    console.log('⚠️  WARNING: Customer does not have a QB customer ID.');
    console.log('   The customer must be synced to QB first.');
  }
}

testSync();
