// Test script to verify QBO cost pulling logic by calling the production API endpoint
const axios = require('axios');

const qboJobId = '2927'; // Your test job
const engagementId = 'd4525cc3-e756-4966-9c42-1b7e0ece9c66'; // Your engagement

async function testOriginalEndpoint() {
  console.log('\n=== Testing Original (Non-Cached) Endpoint ===');
  const url = 'https://flocon.vercel.app/api/qbo/project-costs';
  console.log(`Calling: ${url}?qboJobId=${qboJobId}`);

  try {
    const response = await axios.get(url, {
      params: { qboJobId },
    });

    console.log('\nResponse:');
    console.log(JSON.stringify(response.data, null, 2));

    const netCost = response.data.netCostToDate;
    const expected = 243816.57;
    const diff = Math.abs(netCost - expected);

    console.log(`\n✅ Result: $${netCost}`);
    console.log(`📊 Expected: $${expected}`);
    console.log(`📉 Difference: $${diff.toFixed(2)}`);

    if (diff < 1) {
      console.log('✅ MATCH! Values are within $1');
      console.log('\n🎯 This approach is working correctly!');
    } else if (diff < 100) {
      console.log('⚠️  Close - within $100');
    } else {
      console.log('❌ MISMATCH - significant difference');
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('Error: Endpoint not found (404)');
    } else {
      console.error('Error:', error.response?.data || error.message);
    }
  }
}

async function testProductionEndpoint() {
  console.log('\n=== Testing Cached Endpoint ===');
  console.log(
    `Calling: https://flocon.vercel.app/api/qbo/project-costs-cached?qboJobId=${qboJobId}&engagementId=${engagementId}&forceRefresh=true`
  );

  try {
    const response = await axios.get(
      `https://flocon.vercel.app/api/qbo/project-costs-cached`,
      {
        params: {
          qboJobId,
          engagementId,
          forceRefresh: 'true',
        },
      }
    );

    console.log('\nResponse:');
    console.log(JSON.stringify(response.data, null, 2));

    const netCost = response.data.netCostToDate;
    const expected = 243816.57;
    const diff = Math.abs(netCost - expected);

    console.log(`\n✅ Result: $${netCost}`);
    console.log(`📊 Expected: $${expected}`);
    console.log(`📉 Difference: $${diff.toFixed(2)}`);

    if (diff < 1) {
      console.log('✅ MATCH! Values are within $1');
    } else if (diff < 100) {
      console.log('⚠️  Close - within $100');
    } else {
      console.log('❌ MISMATCH - significant difference');
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('Expected total from QBO: $243,816.57');
  console.log('Testing against production API...\n');

  await testOriginalEndpoint();
  await testProductionEndpoint();
}

main().catch(console.error);
