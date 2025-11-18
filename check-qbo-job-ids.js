// check-qbo-job-ids.js
// Check which projects have QBO job IDs for testing the Reports API

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkQBOJobIds() {
  console.log('Checking projects with QBO Job IDs...\n');

  const { data: projects, error } = await supabase
    .from('engagements')
    .select(
      'id, project_number, name, qbo_job_id, qbo_customer_id, contract_amount, contract_budget'
    )
    .eq('type', 'project')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    return;
  }

  const withQBOJobId = projects.filter((p) => p.qbo_job_id);
  const withoutQBOJobId = projects.filter((p) => !p.qbo_job_id);

  console.log(`Total Projects: ${projects.length}`);
  console.log(`With QBO Job ID: ${withQBOJobId.length}`);
  console.log(`Without QBO Job ID: ${withoutQBOJobId.length}\n`);

  if (withQBOJobId.length > 0) {
    console.log('Projects WITH QBO Job ID:');
    console.log('='.repeat(80));
    withQBOJobId.forEach((p) => {
      console.log(`${p.project_number} - ${p.name}`);
      console.log(`  QBO Job ID: ${p.qbo_job_id}`);
      console.log(`  QBO Customer ID: ${p.qbo_customer_id || 'Not set'}`);
      console.log(
        `  Contract Amount: $${p.contract_amount?.toLocaleString() || 0}`
      );
      console.log(
        `  Contract Budget: $${p.contract_budget?.toLocaleString() || 0}`
      );
      console.log(
        `  Test URL: http://localhost:3000/api/qbo/pull-bills-test?qboJobId=${p.qbo_job_id}&startDate=2024-01-01&endDate=2025-12-31`
      );
      console.log('');
    });
  }

  if (withoutQBOJobId.length > 0) {
    console.log('\nProjects WITHOUT QBO Job ID (sample):');
    console.log('='.repeat(80));
    withoutQBOJobId.slice(0, 5).forEach((p) => {
      console.log(`${p.project_number} - ${p.name}`);
      console.log(
        `  Contract Amount: $${p.contract_amount?.toLocaleString() || 0}`
      );
      console.log(
        `  Contract Budget: $${p.contract_budget?.toLocaleString() || 0}`
      );
      console.log('');
    });
  }

  if (withQBOJobId.length === 0) {
    console.log('\n⚠️  No projects have QBO Job IDs yet.');
    console.log(
      'You can test the endpoint with any QBO Job ID from your QuickBooks account:'
    );
    console.log(
      'http://localhost:3000/api/qbo/pull-bills-test?qboJobId=<some-qb-job-id>&startDate=2024-01-01&endDate=2025-12-31'
    );
  }
}

checkQBOJobIds()
  .then(() => {
    console.log('\n✓ Check complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
