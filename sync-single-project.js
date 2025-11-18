/**
 * Manually sync a single project to see any errors
 */
require('dotenv').config({ path: '.env.local' });

async function syncProject(projectId) {
  console.log(`Syncing project ${projectId}...\n`);

  try {
    const response = await fetch('http://localhost:3000/api/qbo/sync-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Success!');
      console.log(`  Customer ID: ${data.customerId}`);
      console.log(`  Job ID: ${data.jobId}`);
    } else {
      console.log('❌ Failed');
      console.log(`  Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Network error:', error.message);
  }
}

const projectId = process.argv[2];
if (!projectId) {
  console.error('Usage: node sync-single-project.js <project-id>');
  process.exit(1);
}

syncProject(projectId);
