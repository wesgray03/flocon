// Test the sync-billing API directly and see the response
require('dotenv').config({ path: '.env.local' });

async function testSyncAPI() {
  const projectId = 'd4525cc3-e756-4966-9c42-1b7e0ece9c66'; // Project 1290

  console.log('Testing sync-billing API...');
  console.log('Project ID:', projectId);

  try {
    const response = await fetch(
      'https://www.floconapp.com/api/qbo/sync-billing',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add cookie or session if needed
        },
        body: JSON.stringify({ projectId }),
      }
    );

    console.log('Response status:', response.status);
    console.log(
      'Response headers:',
      Object.fromEntries(response.headers.entries())
    );

    const data = await response.json();
    console.log('Response body:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error calling API:', error);
  }
}

testSyncAPI();
