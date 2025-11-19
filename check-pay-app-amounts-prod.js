require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPayAppAmounts() {
  console.log('Checking pay app amounts for project 1292...\n');

  const { data: engagement } = await supabase
    .from('engagements')
    .select('id, project_number, qbo_job_id')
    .eq('project_number', '1292')
    .single();

  if (!engagement) {
    console.log('Project not found');
    return;
  }

  console.log('Project:', engagement.project_number);
  console.log('QB Job ID:', engagement.qbo_job_id);
  console.log();

  const { data: payApps } = await supabase
    .from('engagement_pay_apps')
    .select('*')
    .eq('engagement_id', engagement.id)
    .order('pay_app_number', { ascending: true });

  console.log(`Found ${payApps.length} pay apps:\n`);

  payApps.forEach((pa) => {
    console.log(`Pay App #${pa.pay_app_number}`);
    console.log(`  Description: ${pa.description || 'None'}`);
    console.log(`  Status: ${pa.status || 'None'}`);
    console.log(`  Amount: $${pa.amount || 0}`);
    console.log(`  Current Payment Due: $${pa.current_payment_due || 0}`);
    console.log(`  Date Submitted: ${pa.date_submitted || 'None'}`);
    console.log(`  Period End: ${pa.period_end || 'None'}`);

    // Check if it would sync
    if (!engagement.qbo_job_id) {
      console.log(`  ❌ Would NOT sync: No QB job ID`);
    } else if (!pa.current_payment_due || pa.current_payment_due === 0) {
      console.log(
        `  ⚠️  Would NOT sync: current_payment_due is ${pa.current_payment_due}`
      );
    } else {
      console.log(`  ✅ Would sync`);
    }
    console.log();
  });
}

checkPayAppAmounts();
