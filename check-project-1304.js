/**
 * Check project 1304 in FloCon database
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkFloCon() {
  const projectNumber = process.argv[2] || '1304';
  console.log(`Checking project ${projectNumber} in FloCon...\n`);

  const { data, error } = await supabase
    .from('engagements')
    .select(
      'id, project_number, name, qbo_customer_id, qbo_job_id, qbo_last_synced_at'
    )
    .eq('project_number', projectNumber)
    .single();

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (!data) {
    console.log(`Project ${projectNumber} not found in FloCon`);
    return;
  }

  console.log('FloCon Data:');
  console.log(`  ID: ${data.id}`);
  console.log(`  Project Number: ${data.project_number}`);
  console.log(`  Name: "${data.name}"`);
  console.log(`  QB Customer ID: ${data.qbo_customer_id || 'Not synced'}`);
  console.log(`  QB Job ID: ${data.qbo_job_id || 'Not synced'}`);
  console.log(`  Last Synced: ${data.qbo_last_synced_at || 'Never'}`);

  // If it has a QB job ID, query QB directly
  if (data.qbo_job_id) {
    console.log('\nQuerying QuickBooks by Job ID...\n');

    try {
      const response = await fetch('http://localhost:3000/api/qbo/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `SELECT * FROM Customer WHERE Id = '${data.qbo_job_id}'`,
        }),
      });

      const qbData = await response.json();

      if (qbData.success && qbData.result?.QueryResponse?.Customer?.[0]) {
        const job = qbData.result.QueryResponse.Customer[0];
        console.log('QuickBooks Data:');
        console.log(`  ID: ${job.Id}`);
        console.log(`  DisplayName: "${job.DisplayName}"`);
        console.log(`  FullyQualifiedName: "${job.FullyQualifiedName}"`);
        console.log(`  Job: ${job.Job}`);
        console.log(`  Active: ${job.Active}`);
      } else {
        console.log('Job not found in QuickBooks (may have been deleted)');
      }
    } catch (err) {
      console.error('Error querying QB:', err.message);
    }
  }
}

checkFloCon();
