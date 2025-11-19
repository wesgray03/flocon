require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProject1290() {
  console.log('Checking project 1290...\n');

  const { data: engagement } = await supabase
    .from('engagements')
    .select('id, project_number, qbo_job_id')
    .eq('project_number', '1290')
    .single();

  if (!engagement) {
    console.log('Project not found');
    return;
  }

  console.log('Project:', engagement.project_number);
  console.log('Project ID:', engagement.id);
  console.log('QB Job ID:', engagement.qbo_job_id || 'NOT SET');
  console.log();

  const { data: payApps } = await supabase
    .from('engagement_pay_apps')
    .select('*')
    .eq('engagement_id', engagement.id)
    .order('pay_app_number', { ascending: true });

  console.log(`Found ${payApps?.length || 0} pay apps:\n`);

  if (payApps && payApps.length > 0) {
    payApps.forEach((pa) => {
      console.log(`Pay App #${pa.pay_app_number}`);
      console.log(`  Amount: $${pa.amount || 0}`);
      console.log(`  Current Payment Due: $${pa.current_payment_due || 0}`);
      console.log(`  Status: ${pa.status}`);
      console.log(`  QB Invoice ID: ${pa.qbo_invoice_id || 'None'}`);
      console.log();
    });
  }

  if (!engagement.qbo_job_id) {
    console.log('⚠️  WARNING: Project does not have a QB job ID.');
    console.log(
      '   Sync the project to QuickBooks first from the Projects page.'
    );
  }
}

checkProject1290();
