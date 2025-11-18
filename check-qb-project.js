/**
 * Check what we created in QuickBooks for a specific project
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkProject(projectId) {
  console.log('Checking project in FloCon and QuickBooks...\n');

  // Get project from FloCon
  const { data: project, error } = await supabase
    .from('engagements')
    .select('id, project_number, name, qbo_customer_id, qbo_job_id')
    .eq('id', projectId)
    .single();

  if (error || !project) {
    console.error('Error fetching project:', error);
    return;
  }

  console.log('FloCon Project:');
  console.log(`  ID: ${project.id}`);
  console.log(`  Number: ${project.project_number}`);
  console.log(`  Name: ${project.name}`);
  console.log(`  QB Customer ID: ${project.qbo_customer_id}`);
  console.log(`  QB Job ID: ${project.qbo_job_id}\n`);

  if (!project.qbo_job_id) {
    console.log('⚠️  Project not synced to QuickBooks yet');
    return;
  }

  // Now query QuickBooks API
  try {
    const response = await fetch('http://localhost:3000/api/qbo/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `SELECT * FROM Customer WHERE Id = '${project.qbo_job_id}'`,
      }),
    });

    const data = await response.json();

    if (data.success && data.result?.QueryResponse?.Customer?.[0]) {
      const qbCustomer = data.result.QueryResponse.Customer[0];
      console.log('QuickBooks Customer/Job:');
      console.log(`  ID: ${qbCustomer.Id}`);
      console.log(`  DisplayName: ${qbCustomer.DisplayName}`);
      console.log(`  FullyQualifiedName: ${qbCustomer.FullyQualifiedName}`);
      console.log(`  Job: ${qbCustomer.Job}`);
      console.log(`  BillWithParent: ${qbCustomer.BillWithParent}`);
      console.log(`  ParentRef: ${qbCustomer.ParentRef?.value || 'None'}`);
      console.log(`  Level: ${qbCustomer.Level}`);
      console.log(`  SyncToken: ${qbCustomer.SyncToken}\n`);

      // Check if QB has converted it to a Project
      console.log('🔍 Checking if this appears as a Project in QB...');
      console.log('Note: QB may show this as a Project in the UI even though');
      console.log(
        'the API returns it as a Customer with Job=true and BillWithParent=true'
      );
    } else {
      console.log('❌ Job not found in QuickBooks');
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Error querying QuickBooks:', err);
  }
}

const projectId = process.argv[2];
if (!projectId) {
  console.error('Usage: node check-qb-project.js <project-id>');
  process.exit(1);
}

checkProject(projectId);
