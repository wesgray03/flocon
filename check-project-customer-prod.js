require('dotenv').config({ path: '.env.production.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.production.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProjectCustomer() {
  console.log('Checking project 1292 customer relationship...\n');

  // Get project
  const { data: engagement, error: engError } = await supabase
    .from('engagements')
    .select('*')
    .eq('project_number', '1292')
    .single();

  if (engError) {
    console.error('Error fetching engagement:', engError);
    return;
  }

  console.log('Project ID:', engagement.id);
  console.log('Customer ID field:', engagement.customer_id);
  console.log('QB Job ID:', engagement.qbo_job_id);
  console.log();

  // Get customer from engagement_parties
  const { data: parties, error: partiesError } = await supabase
    .from('engagement_parties')
    .select('*')
    .eq('engagement_id', engagement.id)
    .eq('role', 'customer');

  if (partiesError) {
    console.error('Error fetching parties:', partiesError);
    return;
  }

  console.log(`Found ${parties.length} customer parties:\n`);

  for (const party of parties) {
    console.log('Party type:', party.party_type);
    console.log('Party ID:', party.party_id);

    if (party.party_type === 'company') {
      // Fetch company separately
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', party.party_id)
        .single();

      if (companyError) {
        console.error('Error fetching company:', companyError);
        continue;
      }

      console.log('Company:', company?.name);
      console.log('QB Customer ID:', company?.qbo_id || 'NOT SET');
    } else if (party.party_type === 'contact') {
      console.log('Customer is a contact (not a company)');
    }
    console.log();
  }

  // Check if QB customer exists for the job
  if (engagement.qbo_job_id) {
    console.log('✅ Project has QB Job ID:', engagement.qbo_job_id);
    console.log('   This means the project was synced to QB.');
    console.log('   The customer should also have been synced at that time.');
  }
}

checkProjectCustomer();
