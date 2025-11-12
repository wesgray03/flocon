const { createClient } = require('@supabase/supabase-js');

// Use staging environment with service role key
const supabase = createClient(
  'https://hieokzpxehyelhbubbpb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZW9renB4ZWh5ZWxoYnViYnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1NTU4NCwiZXhwIjoyMDc4MDMxNTg0fQ.rTYiHoUTgQrhRORf65Yfaf_ifb8nRdaMAQI-hcfHmIQ'
);

async function analyzeEngagements() {
  console.log('🔍 Analyzing Engagements Structure...\n');

  // Get sample engagements
  const { data: engagements, error: engError } = await supabase
    .from('engagements')
    .select('*')
    .limit(5);

  if (engError) {
    console.error('❌ Error fetching engagements:', engError);
    return;
  }

  console.log('📊 Sample Engagements:');
  console.log('='.repeat(80));
  if (engagements && engagements.length > 0) {
    console.log('Columns found:', Object.keys(engagements[0]).join(', '));
    console.log('\nFirst engagement:');
    console.log(JSON.stringify(engagements[0], null, 2));
  } else {
    console.log('No engagements found');
  }

  // Get sample contacts
  console.log('\n📋 Sample Contacts:');
  console.log('='.repeat(80));
  const { data: contacts, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .limit(3);

  if (contactError) {
    console.error('❌ Error fetching contacts:', contactError);
  } else if (contacts && contacts.length > 0) {
    console.log('Columns:', Object.keys(contacts[0]).join(', '));
    console.log('\nFirst contact:');
    console.log(JSON.stringify(contacts[0], null, 2));
  }

  // Get sample companies
  console.log('\n🏢 Sample Companies:');
  console.log('='.repeat(80));
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .limit(3);

  if (companyError) {
    console.error('❌ Error fetching companies:', companyError);
  } else if (companies && companies.length > 0) {
    console.log('Columns:', Object.keys(companies[0]).join(', '));
    console.log('\nFirst company:');
    console.log(JSON.stringify(companies[0], null, 2));
  }

  // Count relationships
  console.log('\n📈 Relationship Analysis:');
  console.log('='.repeat(80));

  const { count: totalEngagements } = await supabase
    .from('engagements')
    .select('*', { count: 'exact', head: true });

  console.log(`Total engagements: ${totalEngagements}`);

  // Check which FK columns exist in sample data
  if (engagements && engagements.length > 0) {
    const sampleEng = engagements[0];
    console.log('\nFK columns in engagements table:');
    const fkFields = [
      'company_id',
      'contact_id',
      'architect_id',
      'sales_contact_id',
      'project_manager_id',
      'owner',
    ];
    fkFields.forEach((field) => {
      if (field in sampleEng) {
        console.log(`  ✓ ${field} exists`);
      } else {
        console.log(`  ✗ ${field} does NOT exist`);
      }
    });
  }
}

analyzeEngagements().catch(console.error);
