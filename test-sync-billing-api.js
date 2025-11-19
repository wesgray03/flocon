require('dotenv').config({ path: '.env.production.local' });

// Make a POST request to sync billing for project 1292
async function testSyncBilling() {
  const projectId = '79646165-d349-4310-9ec8-bd6f7508e9cf'; // Project 1292

  console.log('Testing sync billing API for project 1292...\n');

  // Note: This will call the deployed production API
  const response = await fetch(
    'https://www.floconapp.com/api/qbo/sync-billing',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to provide authentication if required
      },
      body: JSON.stringify({ projectId }),
    }
  );

  const data = await response.json();

  console.log('Response status:', response.status);
  console.log('Response data:', JSON.stringify(data, null, 2));
}

testSyncBilling().catch(console.error);
